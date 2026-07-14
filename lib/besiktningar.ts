import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type BesiktningStatus = "aktiv" | "arkiverad";

export type Besiktning = {
  id: string;
  lagenhetsnummer: string;
  besiktningsdatum: string;
  kostnadStadning: number;
  vaktmastareAnteckning: string;
  godkand: boolean | null;
  husformanAnteckning: string;
  totaltAvdrag: number;
  klarForBetalningDatum: string | null;
  betalningGjordDatum: string | null;
  status: BesiktningStatus;
};

export type BesiktningEditInput = {
  besiktningsdatum: string;
  kostnadStadning: number;
  vaktmastareAnteckning: string;
  godkand: boolean | null;
  husformanAnteckning: string;
  totaltAvdrag: number;
};

type BesiktningDoc = Omit<Besiktning, "id"> & { nationsID: string };

async function getCollection() {
  const db = await getDb();
  return db.collection<BesiktningDoc>("besiktningar");
}

function mapDoc(doc: BesiktningDoc & { _id: ObjectId }): Besiktning {
  return {
    id: doc._id.toString(),
    lagenhetsnummer: doc.lagenhetsnummer,
    besiktningsdatum: doc.besiktningsdatum,
    kostnadStadning: doc.kostnadStadning,
    vaktmastareAnteckning: doc.vaktmastareAnteckning,
    godkand: doc.godkand,
    husformanAnteckning: doc.husformanAnteckning,
    totaltAvdrag: doc.totaltAvdrag,
    klarForBetalningDatum: doc.klarForBetalningDatum,
    betalningGjordDatum: doc.betalningGjordDatum,
    status: doc.status,
  };
}

// The weekday immediately before `dateStr`, skipping back over any weekend
// (Sat/Sun) to the closest Mon-Fri. E.g. a Wednesday move-in -> Tuesday;
// a Saturday or Sunday move-in -> the Friday before.
function previousWorkday(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

export async function getBesiktningar(nationsId: string): Promise<Besiktning[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId, status: { $ne: "arkiverad" } })
    .sort({ besiktningsdatum: 1 })
    .toArray();
  return docs.map((d) => mapDoc(d as BesiktningDoc & { _id: ObjectId }));
}

export async function getArkiveradeBesiktningar(nationsId: string): Promise<Besiktning[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId, status: "arkiverad" })
    .sort({ besiktningsdatum: -1 })
    .toArray();
  return docs.map((d) => mapDoc(d as BesiktningDoc & { _id: ObjectId }));
}

// Called when a lease termination is confirmed and the apartment is
// re-listed with a new move-in date — creates the follow-up besiktning row
// with just lägenhetsnummer set, dated the workday before that move-in date.
export async function createBesiktning(
  nationsId: string,
  lagenhetsnummer: string,
  nyttInflyttningsdatum: string
): Promise<void> {
  const col = await getCollection();
  const doc: BesiktningDoc = {
    nationsID: nationsId,
    lagenhetsnummer,
    besiktningsdatum: previousWorkday(nyttInflyttningsdatum),
    kostnadStadning: 0,
    vaktmastareAnteckning: "",
    godkand: null,
    husformanAnteckning: "",
    totaltAvdrag: 0,
    klarForBetalningDatum: null,
    betalningGjordDatum: null,
    status: "aktiv",
  };
  await col.insertOne(doc);
}

export async function updateBesiktning(
  nationsId: string,
  id: string,
  input: BesiktningEditInput
): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id), nationsID: nationsId }, { $set: input });
}

export async function markKlarForBetalning(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { klarForBetalningDatum: new Date().toISOString().slice(0, 10) } }
  );
}

export async function markBetalningGjord(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { betalningGjordDatum: new Date().toISOString().slice(0, 10) } }
  );
}

export async function archiveBesiktning(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { status: "arkiverad" as BesiktningStatus } }
  );
}
