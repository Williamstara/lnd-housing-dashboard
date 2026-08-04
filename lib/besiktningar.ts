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
  // Shared free-text field any of husförman/husvd/ekonomi can fill in —
  // unlike vaktmastareAnteckning/husformanAnteckning, not tied to one role.
  ovrigaAnteckningar: string;
  totaltAvdrag: number;
  klarForBetalningDatum: string | null;
  klarForBetalningAv: string | null;
  betalningGjordDatum: string | null;
  betalningGjordAv: string | null;
  status: BesiktningStatus;
};

export type BesiktningEditInput = {
  besiktningsdatum: string;
  kostnadStadning: number;
  vaktmastareAnteckning: string;
  godkand: boolean | null;
  husformanAnteckning: string;
  ovrigaAnteckningar: string;
  totaltAvdrag: number;
};

export type BesiktningImportInput = BesiktningEditInput & {
  lagenhetsnummer: string;
};

export type BulkUpsertResult = { inserted: number; updated: number };

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
    ovrigaAnteckningar: doc.ovrigaAnteckningar ?? "",
    totaltAvdrag: doc.totaltAvdrag,
    klarForBetalningDatum: doc.klarForBetalningDatum,
    klarForBetalningAv: doc.klarForBetalningAv ?? null,
    betalningGjordDatum: doc.betalningGjordDatum,
    betalningGjordAv: doc.betalningGjordAv ?? null,
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
    ovrigaAnteckningar: "",
    totaltAvdrag: 0,
    klarForBetalningDatum: null,
    klarForBetalningAv: null,
    betalningGjordDatum: null,
    betalningGjordAv: null,
    status: "aktiv",
  };
  await col.insertOne(doc);
}

export async function createManualBesiktning(
  nationsId: string,
  input: BesiktningImportInput
): Promise<void> {
  const col = await getCollection();
  const doc: BesiktningDoc = {
    nationsID: nationsId,
    ...input,
    klarForBetalningDatum: null,
    klarForBetalningAv: null,
    betalningGjordDatum: null,
    betalningGjordAv: null,
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

export async function markKlarForBetalning(nationsId: string, id: string, utfordAv: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { klarForBetalningDatum: new Date().toISOString().slice(0, 10), klarForBetalningAv: utfordAv } }
  );
}

export async function markBetalningGjord(nationsId: string, id: string, utfordAv: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { betalningGjordDatum: new Date().toISOString().slice(0, 10), betalningGjordAv: utfordAv } }
  );
}

export type BulkActionResult = { updated: number; skipped: number };

// Only touches rows not already marked, so re-running over an overlapping
// selection is harmless — already-marked rows are simply counted as skipped
// rather than having their date/utfordAv overwritten.
export async function markKlarForBetalningBulk(
  nationsId: string,
  ids: string[],
  utfordAv: string
): Promise<BulkActionResult> {
  const col = await getCollection();
  const objectIds = ids.map((id) => new ObjectId(id));
  const result = await col.updateMany(
    { _id: { $in: objectIds }, nationsID: nationsId, klarForBetalningDatum: null },
    { $set: { klarForBetalningDatum: new Date().toISOString().slice(0, 10), klarForBetalningAv: utfordAv } }
  );
  return { updated: result.modifiedCount, skipped: ids.length - result.modifiedCount };
}

// Mirrors the single-row rule (payment can't be marked done before it's
// marked ready) — rows missing klarForBetalningDatum are skipped, not errored.
export async function markBetalningGjordBulk(
  nationsId: string,
  ids: string[],
  utfordAv: string
): Promise<BulkActionResult> {
  const col = await getCollection();
  const objectIds = ids.map((id) => new ObjectId(id));
  const result = await col.updateMany(
    {
      _id: { $in: objectIds },
      nationsID: nationsId,
      klarForBetalningDatum: { $ne: null },
      betalningGjordDatum: null,
    },
    { $set: { betalningGjordDatum: new Date().toISOString().slice(0, 10), betalningGjordAv: utfordAv } }
  );
  return { updated: result.modifiedCount, skipped: ids.length - result.modifiedCount };
}

// Mirrors archiveBesiktning's rule (payment must be done first) but skips
// ineligible rows instead of throwing, since a bulk selection commonly mixes
// ready and not-yet-ready rows.
export async function archiveBesiktningarBulk(nationsId: string, ids: string[]): Promise<BulkActionResult> {
  const col = await getCollection();
  const objectIds = ids.map((id) => new ObjectId(id));
  const result = await col.updateMany(
    {
      _id: { $in: objectIds },
      nationsID: nationsId,
      betalningGjordDatum: { $ne: null },
      status: { $ne: "arkiverad" },
    },
    { $set: { status: "arkiverad" as BesiktningStatus } }
  );
  return { updated: result.modifiedCount, skipped: ids.length - result.modifiedCount };
}

// Upserts one row per (lägenhetsnummer, besiktningsdatum) among non-archived
// besiktningar — matches an existing row from the Excel import and updates
// it, or creates a new "aktiv" row if none matches.
export async function bulkUpsertBesiktningar(
  nationsId: string,
  inputs: BesiktningImportInput[]
): Promise<BulkUpsertResult> {
  const col = await getCollection();
  let inserted = 0;
  let updated = 0;
  for (const { lagenhetsnummer, besiktningsdatum, ...rest } of inputs) {
    const result = await col.updateOne(
      { nationsID: nationsId, lagenhetsnummer, besiktningsdatum, status: { $ne: "arkiverad" } },
      {
        $set: { ...rest },
        $setOnInsert: {
          nationsID: nationsId,
          lagenhetsnummer,
          besiktningsdatum,
          klarForBetalningDatum: null,
          klarForBetalningAv: null,
          betalningGjordDatum: null,
          betalningGjordAv: null,
          status: "aktiv" as BesiktningStatus,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount > 0) inserted++;
    else updated++;
  }
  return { inserted, updated };
}

export async function deleteBesiktning(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ _id: new ObjectId(id), nationsID: nationsId });
}

export async function archiveBesiktning(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  const doc = await col.findOne({ _id: new ObjectId(id), nationsID: nationsId });
  if (!doc) throw new Error("Besiktningen hittades inte.");
  if (!doc.betalningGjordDatum) {
    throw new Error("Besiktningen kan inte arkiveras förrän betalning är gjord.");
  }
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { status: "arkiverad" as BesiktningStatus } }
  );
}
