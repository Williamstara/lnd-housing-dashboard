import "server-only";
import { Binary, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type Uppsagning = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  hyresgastNamn: string;
  bekraftelsedatum: string;
  bekraftadAv: string;
  flyttdatum: string;
  dokumentFilnamn: string;
};

export type UppsagningInput = Omit<Uppsagning, "id" | "dokumentFilnamn"> & {
  dokument: { data: Buffer; contentType: string; filename: string };
};

type UppsagningDoc = Omit<Uppsagning, "id" | "dokumentFilnamn"> & {
  nationsID: string;
  dokument: { data: Binary; contentType: string; filename: string };
};

async function getCollection() {
  const db = await getDb();
  return db.collection<UppsagningDoc>("uppsagningar");
}

export async function getUppsagningar(nationsId: string): Promise<Uppsagning[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId }, { projection: { "dokument.data": 0 } })
    .sort({ bekraftelsedatum: -1 })
    .toArray();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    lagenhetsnummer: doc.lagenhetsnummer,
    fastighet: doc.fastighet,
    hyresgastNamn: doc.hyresgastNamn,
    bekraftelsedatum: doc.bekraftelsedatum,
    bekraftadAv: doc.bekraftadAv ?? "",
    flyttdatum: doc.flyttdatum,
    dokumentFilnamn: doc.dokument?.filename ?? "",
  }));
}

export async function createUppsagning(nationsId: string, input: UppsagningInput): Promise<Uppsagning> {
  const col = await getCollection();
  const { dokument, ...rest } = input;
  const result = await col.insertOne({
    ...rest,
    nationsID: nationsId,
    dokument: { data: new Binary(dokument.data), contentType: dokument.contentType, filename: dokument.filename },
  });
  return { ...rest, id: result.insertedId.toString(), dokumentFilnamn: dokument.filename };
}

export async function getUppsagningFile(
  nationsId: string,
  id: string
): Promise<{ data: Buffer; contentType: string; filename: string } | null> {
  const col = await getCollection();
  const doc = await col.findOne({ _id: new ObjectId(id), nationsID: nationsId });
  if (!doc?.dokument) return null;
  return {
    data: Buffer.from(doc.dokument.data.buffer as unknown as ArrayBuffer),
    contentType: doc.dokument.contentType,
    filename: doc.dokument.filename,
  };
}

export async function deleteUppsagning(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ _id: new ObjectId(id), nationsID: nationsId });
}
