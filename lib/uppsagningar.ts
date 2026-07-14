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

type UppsagningDoc = Omit<Uppsagning, "id"> & { nationsID: string };

async function getCollection() {
  const db = await getDb();
  return db.collection<UppsagningDoc>("uppsagningar");
}

export async function getUppsagningar(nationsId: string): Promise<Uppsagning[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId })
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

export async function createUppsagning(nationsId: string, input: UppsagningInput): Promise<Uppsagning> {
  const col = await getCollection();
  const result = await col.insertOne({ ...input, nationsID: nationsId });
  return { ...input, id: result.insertedId.toString() };
}

export async function deleteUppsagning(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ _id: new ObjectId(id), nationsID: nationsId });
}
