import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  getAllApartments,
  getApartmentsByIds,
  getApartmentsWithPastLedigFrom,
  type Apartment,
} from "@/lib/apartments";
import { getRentalObjectsByIds } from "@/lib/rentalobjects";

// A row is anchored to exactly one of apartmentId (the automatic
// ledig-fr.o.m.-passed sync, or a manual pick from Lediga lägenheter) or
// rentalObjectId (a manual pick straight from Databas, for rent missed for
// reasons other than a listed vacancy — e.g. an occupied unit that simply
// never paid). manualLedigFrom only applies to the rentalObjectId case,
// since RentalObject has no ledigFrom of its own to derive one from.
// (Enforced in Postgres by missed_rent's XOR check constraint.)
type MissedRentRecord = {
  id: string;
  apartment_id: string | null;
  rental_object_id: string | null;
  manual_ledig_from: string | null;
  faktiskt_inflytt_datum: string | null;
  ovriga_missade_kostnader: number | null;
  kommentar: string | null;
  ansvarig: string | null;
};

const MISSED_RENT_COLUMNS =
  "id, apartment_id, rental_object_id, manual_ledig_from, faktiskt_inflytt_datum, ovriga_missade_kostnader, kommentar, ansvarig" as const;

export type MissedRentRow = {
  id: string;
  apartmentId: string | null;
  rentalObjectId: string | null;
  source: "apartment" | "databas";
  lagenhetsnummer: string;
  fastighet: string;
  ledigFrom: string;
  faktisktInflyttDatum: string | null;
  arshyra: number;
  hyresrabatt: number;
  hyresreduktion: number;
  arshyraMedRed: number;
  manadshyra: number;
  missadIntakt: number;
  ovrigaMissadeKostnader: number;
  totalMissat: number;
  kommentar: string;
  ansvarig: string;
};

export type MissedRentUpdateInput = {
  faktisktInflyttDatum?: string | null;
  ovrigaMissadeKostnader?: number;
  kommentar?: string;
  ansvarig?: string;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Number of months between two dates, as a real calendar-month count (not a
// days/30 approximation) so a gap of exactly one calendar month — e.g.
// 2026-07-01 to 2026-08-01 — comes out to exactly 1, regardless of how many
// days that particular month has. Any leftover partial month is prorated
// against the actual length of that specific month.
function monthsBetween(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  if (toDate <= fromDate) return 0;

  let months = 0;
  let cursor = fromDate;
  for (let i = 0; i < 1200; i++) {
    const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate()));
    if (next.getTime() > toDate.getTime()) break;
    cursor = next;
    months++;
  }

  const nextMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, cursor.getUTCDate()));
  const spanDays = (nextMonth.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24);
  const remainderDays = (toDate.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24);

  return months + (spanDays > 0 ? remainderDays / spanDays : 0);
}

// Ensures every apartment whose ledigFrom has passed has a missed-rent
// tracking row. Idempotent — safe to call on every relevant page load.
export async function syncMissedRent(nationsId: string): Promise<void> {
  const pastDue = await getApartmentsWithPastLedigFrom(nationsId, today());
  if (pastDue.length === 0) return;

  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("missed_rent")
    .select("apartment_id")
    .eq("nations_id", nationsId)
    .in("apartment_id", pastDue.map((a) => a.id));
  if (findError) throw findError;
  const existingIds = new Set((existing as { apartment_id: string | null }[]).map((d) => d.apartment_id));

  const missing = pastDue.filter((a) => !existingIds.has(a.id));
  if (missing.length === 0) return;

  const { error } = await supabase.from("missed_rent").insert(
    missing.map((a) => ({
      nations_id: nationsId,
      apartment_id: a.id,
      rental_object_id: null,
      manual_ledig_from: null,
      faktiskt_inflytt_datum: null,
      ovriga_missade_kostnader: 0,
      kommentar: "",
      ansvarig: "",
    }))
  );
  if (error) throw error;
}

// Apartments that don't already have a missed-rent row — the pick-list for
// manually adding one.
export async function getApartmentsAvailableForManualEntry(nationsId: string): Promise<Apartment[]> {
  const supabase = createSupabaseServerClient();
  const [apartments, tracked] = await Promise.all([
    getAllApartments(nationsId),
    supabase.from("missed_rent").select("apartment_id").eq("nations_id", nationsId),
  ]);
  if (tracked.error) throw tracked.error;
  const trackedIds = new Set(
    (tracked.data as { apartment_id: string | null }[])
      .map((d) => d.apartment_id)
      .filter((id): id is string => !!id)
  );
  return apartments.filter((a) => !trackedIds.has(a.id));
}

// Manually flags an apartment as a missed-rent case — e.g. a contract with
// wrong numbers, discovered outside the automatic ledig-fr.o.m.-passed sync.
export async function createManualMissedRent(nationsId: string, apartmentId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("missed_rent")
    .select("id")
    .eq("nations_id", nationsId)
    .eq("apartment_id", apartmentId)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) {
    throw new Error("Den här lägenheten finns redan i listan över missade hyror.");
  }
  const { error } = await supabase.from("missed_rent").insert({
    nations_id: nationsId,
    apartment_id: apartmentId,
    rental_object_id: null,
    manual_ledig_from: null,
    faktiskt_inflytt_datum: null,
    ovriga_missade_kostnader: 0,
    kommentar: "",
    ansvarig: "",
  });
  if (error) throw error;
}

// A rental object may have no Apartment record at all (e.g. it's currently
// occupied) yet still have missed rent — a tenant who didn't pay, a wrong
// contract, etc. — so this lets a row be anchored directly to Databas
// instead of requiring an entry in the lediga lägenheter pipeline.
// missedSince has no automatic source of truth here (RentalObject has no
// ledigFrom), so it's provided by whoever adds the row.
export async function createManualMissedRentFromRentalObject(
  nationsId: string,
  rentalObjectId: string,
  missedSince: string
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("missed_rent")
    .select("id")
    .eq("nations_id", nationsId)
    .eq("rental_object_id", rentalObjectId)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) {
    throw new Error("Den här lägenheten finns redan i listan över missade hyror.");
  }
  const { error } = await supabase.from("missed_rent").insert({
    nations_id: nationsId,
    apartment_id: null,
    rental_object_id: rentalObjectId,
    manual_ledig_from: missedSince,
    faktiskt_inflytt_datum: null,
    ovriga_missade_kostnader: 0,
    kommentar: "",
    ansvarig: "",
  });
  if (error) throw error;
}

export async function getMissedRentRows(nationsId: string): Promise<MissedRentRow[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("missed_rent")
    .select(MISSED_RENT_COLUMNS)
    .eq("nations_id", nationsId);
  if (error) throw error;
  const docs = data as MissedRentRecord[];
  if (docs.length === 0) return [];

  const apartmentIds = docs.filter((d) => d.apartment_id).map((d) => d.apartment_id!);
  const rentalObjectIds = docs.filter((d) => d.rental_object_id).map((d) => d.rental_object_id!);
  const [apartments, rentalObjects] = await Promise.all([
    getApartmentsByIds(nationsId, apartmentIds),
    getRentalObjectsByIds(nationsId, rentalObjectIds),
  ]);
  const apartmentById = new Map(apartments.map((a) => [a.id, a]));
  const rentalObjectById = new Map(rentalObjects.map((r) => [r.id, r]));

  const rows: MissedRentRow[] = [];
  for (const doc of docs) {
    let source: MissedRentRow["source"];
    let lagenhetsnummer: string;
    let fastighet: string;
    let ledigFrom: string;
    let arshyra: number;
    let hyresrabatt: number;
    let hyresreduktion: number;
    let arshyraMedRed: number;
    let manadshyra: number;

    if (doc.apartment_id) {
      const apartment = apartmentById.get(doc.apartment_id);
      if (!apartment) continue; // apartment was deleted since — skip defensively
      source = "apartment";
      lagenhetsnummer = apartment.lagenhetsnummer;
      fastighet = apartment.fastighet;
      ledigFrom = apartment.ledigFrom;
      arshyra = apartment.arshyra;
      hyresrabatt = apartment.hyresrabatt;
      hyresreduktion = apartment.hyresreduktion;
      arshyraMedRed = apartment.arshyraMedRed;
      manadshyra = apartment.manadshyra;
    } else if (doc.rental_object_id) {
      const rentalObject = rentalObjectById.get(doc.rental_object_id);
      if (!rentalObject) continue; // rental object was deleted since — skip defensively
      source = "databas";
      lagenhetsnummer = rentalObject.lagenhetsnummer;
      fastighet = rentalObject.fastighet;
      ledigFrom = doc.manual_ledig_from ?? today();
      arshyra = rentalObject.malbildshyra ?? 0;
      hyresrabatt = rentalObject.hyresrabatt ?? 0;
      hyresreduktion = rentalObject.hyresred ?? 0;
      arshyraMedRed = rentalObject.individuellArshyra ?? 0;
      manadshyra = rentalObject.manadshyra ?? 0;
    } else {
      continue; // malformed doc — neither reference set
    }

    const endDate = doc.faktiskt_inflytt_datum ?? today();
    const missedMonths = monthsBetween(ledigFrom, endDate);
    const missadIntakt = Math.round(manadshyra * missedMonths);
    const ovrigaMissadeKostnader = doc.ovriga_missade_kostnader ?? 0;

    rows.push({
      id: doc.id,
      apartmentId: doc.apartment_id,
      rentalObjectId: doc.rental_object_id,
      source,
      lagenhetsnummer,
      fastighet,
      ledigFrom,
      faktisktInflyttDatum: doc.faktiskt_inflytt_datum,
      arshyra,
      hyresrabatt,
      hyresreduktion,
      arshyraMedRed,
      manadshyra,
      missadIntakt,
      ovrigaMissadeKostnader,
      totalMissat: missadIntakt + ovrigaMissadeKostnader,
      kommentar: doc.kommentar ?? "",
      ansvarig: doc.ansvarig ?? "",
    });
  }

  return rows.sort((a, b) => a.ledigFrom.localeCompare(b.ledigFrom));
}

export async function updateMissedRent(
  nationsId: string,
  id: string,
  input: MissedRentUpdateInput
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const update: Record<string, unknown> = {};
  if ("faktisktInflyttDatum" in input) update.faktiskt_inflytt_datum = input.faktisktInflyttDatum;
  if ("ovrigaMissadeKostnader" in input) update.ovriga_missade_kostnader = input.ovrigaMissadeKostnader;
  if ("kommentar" in input) update.kommentar = input.kommentar;
  if ("ansvarig" in input) update.ansvarig = input.ansvarig;
  const { error } = await supabase
    .from("missed_rent")
    .update(update)
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function deleteMissedRent(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("missed_rent")
    .delete()
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}
