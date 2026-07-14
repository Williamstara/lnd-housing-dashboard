import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import {
  getAllApartments,
  getApartmentsByIds,
  getApartmentsWithPastLedigFrom,
  type Apartment,
} from "@/lib/apartments";

type MissedRentDoc = {
  nationsID: string;
  apartmentId: string;
  faktisktInflyttDatum: string | null;
  ovrigaMissadeKostnader: number;
  kommentar: string;
  ansvarig: string;
};

export type MissedRentRow = {
  id: string;
  apartmentId: string;
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
  const trackedIds = new Set(tracked.map((d) => d.apartmentId));
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

  const apartments = await getApartmentsByIds(
    nationsId,
    docs.map((d) => d.apartmentId)
  );
  const apartmentById = new Map(apartments.map((a) => [a.id, a]));

  const rows: MissedRentRow[] = [];
  for (const doc of docs) {
    const apartment = apartmentById.get(doc.apartmentId);
    if (!apartment) continue; // apartment was deleted since — skip defensively

    const endDate = doc.faktisktInflyttDatum ?? today();
    const missedMonths = monthsBetween(apartment.ledigFrom, endDate);
    const missadIntakt = Math.round(apartment.manadshyra * missedMonths);
    const ovrigaMissadeKostnader = doc.ovrigaMissadeKostnader ?? 0;

    rows.push({
      id: doc._id.toString(),
      apartmentId: doc.apartmentId,
      lagenhetsnummer: apartment.lagenhetsnummer,
      fastighet: apartment.fastighet,
      ledigFrom: apartment.ledigFrom,
      faktisktInflyttDatum: doc.faktisktInflyttDatum,
      arshyra: apartment.arshyra,
      hyresrabatt: apartment.hyresrabatt,
      hyresreduktion: apartment.hyresreduktion,
      arshyraMedRed: apartment.arshyraMedRed,
      manadshyra: apartment.manadshyra,
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
