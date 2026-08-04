import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
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
type MissedRentDoc = {
  nationsID: string;
  apartmentId: string | null;
  rentalObjectId: string | null;
  manualLedigFrom: string | null;
  faktisktInflyttDatum: string | null;
  ovrigaMissadeKostnader: number;
  kommentar: string;
  ansvarig: string;
};

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

async function getCollection() {
  const db = await getDb();
  return db.collection<MissedRentDoc>("missed-rent");
}

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

  const col = await getCollection();
  const existing = await col
    .find(
      { nationsID: nationsId, apartmentId: { $in: pastDue.map((a) => a.id) } },
      { projection: { apartmentId: 1 } }
    )
    .toArray();
  const existingIds = new Set(existing.map((d) => d.apartmentId));

  const missing = pastDue.filter((a) => !existingIds.has(a.id));
  if (missing.length === 0) return;

  await col.insertMany(
    missing.map((a) => ({
      nationsID: nationsId,
      apartmentId: a.id,
      rentalObjectId: null,
      manualLedigFrom: null,
      faktisktInflyttDatum: null,
      ovrigaMissadeKostnader: 0,
      kommentar: "",
      ansvarig: "",
    }))
  );
}

// Apartments that don't already have a missed-rent row — the pick-list for
// manually adding one.
export async function getApartmentsAvailableForManualEntry(nationsId: string): Promise<Apartment[]> {
  const [apartments, col] = await Promise.all([getAllApartments(nationsId), getCollection()]);
  const tracked = await col
    .find({ nationsID: nationsId }, { projection: { apartmentId: 1 } })
    .toArray();
  const trackedIds = new Set(tracked.map((d) => d.apartmentId).filter((id): id is string => !!id));
  return apartments.filter((a) => !trackedIds.has(a.id));
}

// Manually flags an apartment as a missed-rent case — e.g. a contract with
// wrong numbers, discovered outside the automatic ledig-fr.o.m.-passed sync.
export async function createManualMissedRent(nationsId: string, apartmentId: string): Promise<void> {
  const col = await getCollection();
  const existing = await col.findOne({ nationsID: nationsId, apartmentId });
  if (existing) {
    throw new Error("Den här lägenheten finns redan i listan över missade hyror.");
  }
  await col.insertOne({
    nationsID: nationsId,
    apartmentId,
    rentalObjectId: null,
    manualLedigFrom: null,
    faktisktInflyttDatum: null,
    ovrigaMissadeKostnader: 0,
    kommentar: "",
    ansvarig: "",
  });
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
  const col = await getCollection();
  const existing = await col.findOne({ nationsID: nationsId, rentalObjectId });
  if (existing) {
    throw new Error("Den här lägenheten finns redan i listan över missade hyror.");
  }
  await col.insertOne({
    nationsID: nationsId,
    apartmentId: null,
    rentalObjectId,
    manualLedigFrom: missedSince,
    faktisktInflyttDatum: null,
    ovrigaMissadeKostnader: 0,
    kommentar: "",
    ansvarig: "",
  });
}

export async function getMissedRentRows(nationsId: string): Promise<MissedRentRow[]> {
  const col = await getCollection();
  const docs = await col.find({ nationsID: nationsId }).toArray();
  if (docs.length === 0) return [];

  const apartmentIds = docs.filter((d) => d.apartmentId).map((d) => d.apartmentId!);
  const rentalObjectIds = docs.filter((d) => d.rentalObjectId).map((d) => d.rentalObjectId!);
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

    if (doc.apartmentId) {
      const apartment = apartmentById.get(doc.apartmentId);
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
    } else if (doc.rentalObjectId) {
      const rentalObject = rentalObjectById.get(doc.rentalObjectId);
      if (!rentalObject) continue; // rental object was deleted since — skip defensively
      source = "databas";
      lagenhetsnummer = rentalObject.lagenhetsnummer;
      fastighet = rentalObject.fastighet;
      ledigFrom = doc.manualLedigFrom ?? today();
      arshyra = rentalObject.malbildshyra ?? 0;
      hyresrabatt = rentalObject.hyresrabatt ?? 0;
      hyresreduktion = rentalObject.hyresred ?? 0;
      arshyraMedRed = rentalObject.individuellArshyra ?? 0;
      manadshyra = rentalObject.manadshyra ?? 0;
    } else {
      continue; // malformed doc — neither reference set
    }

    const endDate = doc.faktisktInflyttDatum ?? today();
    const missedMonths = monthsBetween(ledigFrom, endDate);
    const missadIntakt = Math.round(manadshyra * missedMonths);
    const ovrigaMissadeKostnader = doc.ovrigaMissadeKostnader ?? 0;

    rows.push({
      id: doc._id.toString(),
      apartmentId: doc.apartmentId,
      rentalObjectId: doc.rentalObjectId,
      source,
      lagenhetsnummer,
      fastighet,
      ledigFrom,
      faktisktInflyttDatum: doc.faktisktInflyttDatum,
      arshyra,
      hyresrabatt,
      hyresreduktion,
      arshyraMedRed,
      manadshyra,
      missadIntakt,
      ovrigaMissadeKostnader,
      totalMissat: missadIntakt + ovrigaMissadeKostnader,
      kommentar: doc.kommentar,
      ansvarig: doc.ansvarig,
    });
  }

  return rows.sort((a, b) => a.ledigFrom.localeCompare(b.ledigFrom));
}

export async function updateMissedRent(
  nationsId: string,
  id: string,
  input: MissedRentUpdateInput
): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id), nationsID: nationsId }, { $set: input });
}

export async function deleteMissedRent(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ _id: new ObjectId(id), nationsID: nationsId });
}
