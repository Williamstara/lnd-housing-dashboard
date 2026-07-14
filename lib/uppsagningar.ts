import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type Uppsagning = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  hyresgastNamn: string;
  bekraftelsedatum: string;
  flyttdatum: string;
};

export type UppsagningInput = Omit<Uppsagning, "id">;

type UppsagningDoc = Omit<Uppsagning, "id">;

async function getCollection() {
  const db = await getDb();
  return db.collection<UppsagningDoc>("uppsagningar");
}

export async function getUppsagningar(): Promise<Uppsagning[]> {
  const col = await getCollection();
  const docs = await col
    .find()
    .sort({ bekraftelsedatum: -1 })
    .toArray();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    lagenhetsnummer: doc.lagenhetsnummer,
    fastighet: doc.fastighet,
    hyresgastNamn: doc.hyresgastNamn,
    bekraftelsedatum: doc.bekraftelsedatum,
    flyttdatum: doc.flyttdatum,
  }));
}

export async function createUppsagning(input: UppsagningInput): Promise<Uppsagning> {
  const col = await getCollection();
  const result = await col.insertOne(input);
  return { ...input, id: result.insertedId.toString() };
}

export async function deleteUppsagning(id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
}
