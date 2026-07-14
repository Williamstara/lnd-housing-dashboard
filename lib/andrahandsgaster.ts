import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type Andrahandsgast = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  personnummer: string;
  mejladress: string;
  telefonnummer: string;
};

export type AndrahandsgastInput = {
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  personnummer: string;
  mejladress: string;
  telefonnummer: string;
};

type AndrahandsgastDocument = AndrahandsgastInput & { nationsID: string };

async function getCollection() {
  const db = await getDb();
  return db.collection<AndrahandsgastDocument>("andrahandsgaster");
}

export async function getAndrahandsgaster(nationsId: string): Promise<Andrahandsgast[]> {
  const collection = await getCollection();
  const docs = await collection
    .find({ nationsID: nationsId })
    .sort({ lagenhetsnummer: 1 })
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    lagenhetsnummer: doc.lagenhetsnummer,
    fastighet: doc.fastighet,
    namn: doc.namn,
    personnummer: doc.personnummer ?? "",
    mejladress: doc.mejladress,
    telefonnummer: doc.telefonnummer,
  }));
}

export async function createAndrahandsgast(nationsId: string, input: AndrahandsgastInput): Promise<string> {
  const collection = await getCollection();
  const result = await collection.insertOne({ ...input, nationsID: nationsId });
  return result.insertedId.toString();
}

export async function updateAndrahandsgast(
  nationsId: string,
  id: string,
  input: AndrahandsgastInput
): Promise<void> {
  const collection = await getCollection();
  await collection.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: input }
  );
}

export async function deleteAndrahandsgast(nationsId: string, id: string): Promise<void> {
  const collection = await getCollection();
  await collection.deleteOne({ _id: new ObjectId(id), nationsID: nationsId });
}

export type BulkUpsertAndrahandsgastResult = { inserted: number; updated: number };

export async function bulkUpsertAndrahandsgaster(
  nationsId: string,
  inputs: AndrahandsgastInput[]
): Promise<BulkUpsertAndrahandsgastResult> {
  const collection = await getCollection();
  let inserted = 0;
  let updated = 0;
  for (const input of inputs) {
    const result = await collection.updateOne(
      { nationsID: nationsId, lagenhetsnummer: input.lagenhetsnummer },
      { $set: { ...input, nationsID: nationsId } },
      { upsert: true }
    );
    if (result.upsertedCount > 0) inserted++;
    else updated++;
  }
  return { inserted, updated };
}
