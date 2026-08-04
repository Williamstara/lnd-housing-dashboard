import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type Fastighet = {
  id: string;
  namn: string;
  // Lägenhetsnummer prefixes that identify this building (e.g. Arkivet's
  // apartments start "B"/"C"/"D") — lets an import derive fastighet from
  // lägenhetsnummer alone when the sheet has no Fastighet column.
  prefixes: string[];
};

type FastighetDoc = {
  nationsID: string;
  namn: string;
  prefixes?: string[];
};

async function getCollection() {
  const db = await getDb();
  return db.collection<FastighetDoc>("fastigheter");
}

// _id embeds creation time, so sorting by it preserves insertion order.
export async function getFastigheter(nationsId: string): Promise<Fastighet[]> {
  const col = await getCollection();
  const docs = await col.find({ nationsID: nationsId }).sort({ _id: 1 }).toArray();
  return docs.map((doc) => ({ id: doc._id.toString(), namn: doc.namn, prefixes: doc.prefixes ?? [] }));
}

export async function getFastighetNamn(nationsId: string): Promise<string[]> {
  const fastigheter = await getFastigheter(nationsId);
  return fastigheter.map((f) => f.namn);
}

export async function createFastighet(
  nationsId: string,
  namn: string,
  prefixes: string[] = []
): Promise<Fastighet> {
  const col = await getCollection();
  const result = await col.insertOne({ nationsID: nationsId, namn, prefixes });
  return { id: result.insertedId.toString(), namn, prefixes };
}

export async function updateFastighet(
  nationsId: string,
  id: string,
  namn: string,
  prefixes: string[]
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { namn, prefixes } }
  );
}

export async function deleteFastighet(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ _id: new ObjectId(id), nationsID: nationsId });
}
