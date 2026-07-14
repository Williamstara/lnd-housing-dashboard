import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

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
};

export type RentalObjectInput = Omit<RentalObject, "id">;

type RentalObjectDocument = RentalObjectInput;

async function getCollection() {
  const db = await getDb();
  return db.collection<RentalObjectDocument>("rentalobjects");
}

export async function getRentalObjects(): Promise<RentalObject[]> {
  const col = await getCollection();
  const docs = await col
    .find()
    .sort({ fastighet: 1, lagenhetsnummer: 1 })
    .toArray();
  return docs.map((doc) => ({
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
  }));
}

export async function createRentalObject(input: RentalObjectInput): Promise<string> {
  const col = await getCollection();
  const result = await col.insertOne(input as RentalObjectDocument);
  return result.insertedId.toString();
}

export async function updateRentalObject(id: string, input: RentalObjectInput): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: input });
}

export async function deleteRentalObject(id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
}

// Tries to find a rental object matching a tenant's apartment.
// First tries an exact lagenhetsnummer match, then tries each prefix
// that corresponds to the fastighet (for cases where the tenant record
// stores "1402" but the databas has "GH1402").
export async function findRentalObjectForApartment(
  lagenhetsnummer: string,
  fastighet: string
): Promise<RentalObject | null> {
  const col = await getCollection();

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
    };
  }

  const exact = await col.findOne({ lagenhetsnummer });
  if (exact) return mapDoc(exact as RentalObjectDocument & { _id: ObjectId });

  for (const prefix of FASTIGHET_PREFIXES[fastighet] ?? []) {
    const prefixed = await col.findOne({ lagenhetsnummer: prefix + lagenhetsnummer });
    if (prefixed) return mapDoc(prefixed as RentalObjectDocument & { _id: ObjectId });
  }

  return null;
}

export type BulkUpsertRentalResult = { inserted: number; updated: number };

export async function bulkUpsertRentalObjects(
  inputs: RentalObjectInput[]
): Promise<BulkUpsertRentalResult> {
  const col = await getCollection();
  let inserted = 0;
  let updated = 0;
  for (const input of inputs) {
    const result = await col.updateOne(
      { lagenhetsnummer: input.lagenhetsnummer },
      { $set: input },
      { upsert: true }
    );
    if (result.upsertedCount > 0) inserted++;
    else updated++;
  }
  return { inserted, updated };
}
