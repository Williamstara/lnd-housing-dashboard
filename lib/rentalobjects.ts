import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { ApartmentSpecs } from "@/lib/apartments";

// Prefixes used in the databas lagenhetsnummer per fastighet.
// Needed when the tenant's lagenhetsnummer (e.g. "1402") doesn't include
// the prefix that was added on import (e.g. "GH1402").
const FASTIGHET_PREFIXES: Record<string, string[]> = {
  "Gamla huset (223 51, Lund)": ["GH"],
  "Nya huset (223 51, Lund)": ["NH"],
  "Finn huset (223 51, Lund)": ["FH"],
  "Arkivet (223 59, Lund)": ["B", "C", "D"],
};

export type RentalObject = {
  id: string;
  fastighet: string;
  lagenhetsnummer: string;
  area: number | null;
  areaInkKorr: number | null;
  typ: string;
  malbildshyra: number | null;
  renoveringsbehov: number | null;
  hyresrabatt: number | null;
  hyresred: number | null;
  individuellArshyra: number | null;
  manadshyra: number | null;
  planritning: string | null;
  // Nation-defined free-text fields (e.g. "notes") configured via the admin
  // page — never read by any calculation, purely stored and displayed.
  custom: Record<string, string>;
};

export type RentalObjectInput = Omit<RentalObject, "id" | "custom"> & {
  custom?: Record<string, string>;
};

type RentalObjectDocument = Omit<RentalObject, "id"> & { nationsID: string };

async function getCollection() {
  const db = await getDb();
  return db.collection<RentalObjectDocument>("rentalobjects");
}

function mapDoc(doc: RentalObjectDocument & { _id: ObjectId }): RentalObject {
  return {
    id: doc._id.toString(),
    fastighet: doc.fastighet,
    lagenhetsnummer: doc.lagenhetsnummer,
    area: doc.area ?? null,
    areaInkKorr: doc.areaInkKorr ?? null,
    typ: doc.typ ?? "",
    malbildshyra: doc.malbildshyra ?? null,
    renoveringsbehov: doc.renoveringsbehov ?? null,
    hyresrabatt: doc.hyresrabatt ?? null,
    hyresred: doc.hyresred ?? null,
    individuellArshyra: doc.individuellArshyra ?? null,
    manadshyra: doc.manadshyra ?? null,
    planritning: doc.planritning ?? null,
    custom: doc.custom ?? {},
  };
}

export async function getRentalObjects(nationsId: string): Promise<RentalObject[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId })
    .sort({ fastighet: 1, lagenhetsnummer: 1 })
    .toArray();
  return docs.map((doc) => mapDoc(doc as RentalObjectDocument & { _id: ObjectId }));
}

export async function createRentalObject(nationsId: string, input: RentalObjectInput): Promise<string> {
  const col = await getCollection();
  const doc: RentalObjectDocument = { ...input, nationsID: nationsId, custom: input.custom ?? {} };
  const result = await col.insertOne(doc);
  return result.insertedId.toString();
}

export async function updateRentalObject(
  nationsId: string,
  id: string,
  input: RentalObjectInput
): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id), nationsID: nationsId }, { $set: input });
}

export async function deleteRentalObject(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ _id: new ObjectId(id), nationsID: nationsId });
}

// Pushes pricing edited on an apartment (Lediga lägenheter) back onto its
// matching databas entry, the reverse direction of
// syncApartmentPricingFromRentalObject. Only touches the pricing fields —
// area/typ/renoveringsbehov/planritning aren't known from the apartment side.
export async function updateRentalObjectPricing(
  nationsId: string,
  id: string,
  updates: Pick<RentalObjectInput, "malbildshyra" | "hyresrabatt" | "hyresred" | "individuellArshyra" | "manadshyra">
): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id), nationsID: nationsId }, { $set: updates });
}

// Tries to find a rental object matching a tenant's apartment.
// First tries an exact lagenhetsnummer match, then tries each prefix
// that corresponds to the fastighet (for cases where the tenant record
// stores "1402" but the databas has "GH1402").
export async function findRentalObjectForApartment(
  nationsId: string,
  lagenhetsnummer: string,
  fastighet: string
): Promise<RentalObject | null> {
  const col = await getCollection();

  const exact = await col.findOne({ nationsID: nationsId, lagenhetsnummer });
  if (exact) return mapDoc(exact as RentalObjectDocument & { _id: ObjectId });

  for (const prefix of FASTIGHET_PREFIXES[fastighet] ?? []) {
    const prefixed = await col.findOne({
      nationsID: nationsId,
      lagenhetsnummer: prefix + lagenhetsnummer,
    });
    if (prefixed) return mapDoc(prefixed as RentalObjectDocument & { _id: ObjectId });
  }

  return null;
}

const ALL_PREFIXES = Array.from(new Set(Object.values(FASTIGHET_PREFIXES).flat()));

// Same matching as findRentalObjectForApartment, but for when the fastighet
// isn't known yet (e.g. typing a lägenhetsnummer before picking a fastighet)
// — tries an exact match, then every fastighet's prefix in turn.
export async function findRentalObjectByLagenhetsnummer(
  nationsId: string,
  lagenhetsnummer: string
): Promise<RentalObject | null> {
  const col = await getCollection();

  const exact = await col.findOne({ nationsID: nationsId, lagenhetsnummer });
  if (exact) return mapDoc(exact as RentalObjectDocument & { _id: ObjectId });

  for (const prefix of ALL_PREFIXES) {
    const prefixed = await col.findOne({
      nationsID: nationsId,
      lagenhetsnummer: prefix + lagenhetsnummer,
    });
    if (prefixed) return mapDoc(prefixed as RentalObjectDocument & { _id: ObjectId });
  }

  return null;
}

export function rentalObjectToApartmentSpecs(ro: RentalObject): ApartmentSpecs {
  const area = ro.areaInkKorr ?? ro.area;
  return {
    fastighet: ro.fastighet,
    storlek: area != null ? `${area} m²` : "",
    objekttyp: ro.typ ?? "",
    antalRum: 0,
    arshyra: ro.malbildshyra ?? 0,
    hyresrabatt: ro.hyresrabatt ?? 0,
    hyresreduktion: ro.hyresred ?? 0,
    arshyraMedRed: ro.individuellArshyra ?? 0,
    manadshyra: ro.manadshyra ?? 0,
  };
}

export type BulkUpsertRentalResult = { inserted: number; updated: number };

export async function bulkUpsertRentalObjects(
  nationsId: string,
  inputs: RentalObjectInput[]
): Promise<BulkUpsertRentalResult> {
  const col = await getCollection();
  let inserted = 0;
  let updated = 0;
  for (const input of inputs) {
    const result = await col.updateOne(
      { nationsID: nationsId, lagenhetsnummer: input.lagenhetsnummer },
      { $set: { ...input, nationsID: nationsId } },
      { upsert: true }
    );
    if (result.upsertedCount > 0) inserted++;
    else updated++;
  }
  return { inserted, updated };
}
