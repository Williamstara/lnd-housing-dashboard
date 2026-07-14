import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type ApartmentStatus =
  | "ledig"
  | "kontaktad"
  | "redo_for_kontrakt"
  | "arkiverad";

export type ApartmentInput = {
  lagenhetsnummer: string;
  fastighet: string;
  storlek: string;
  objekttyp: string;
  antalRum: number;
  ledigFrom: string;
  arshyra: number;
  hyresreduktion: number;
  arshyraMedRed: number;
  manadshyra: number;
};

export type ContactInput = {
  kontaktperson: string;
  svarSenast: string;
};

export type TenantAssignmentInput = {
  hyresgastNamn: string;
  personnummer: string;
  epost: string;
  telefonnummer: string;
  kontonummer: string;
};

export type Apartment = ApartmentInput & {
  id: string;
  status: ApartmentStatus;
  hidden: boolean;
  kontaktperson?: string;
  svarSenast?: string;
  hyresgastNamn?: string;
  personnummer?: string;
  epost?: string;
  telefonnummer?: string;
  kontonummer?: string;
  kontraktSkickatDatum?: string;
  kontraktSigneratDatum?: string;
  tillagdIHyresgastlistaDatum?: string;
};

type ApartmentDoc = Omit<Apartment, "id">;

async function getCollection() {
  const db = await getDb();
  return db.collection<ApartmentDoc>("apartments");
}

function mapDoc(doc: ApartmentDoc & { _id: ObjectId }): Apartment {
  return {
    id: doc._id.toString(),
    lagenhetsnummer: doc.lagenhetsnummer,
    fastighet: doc.fastighet,
    storlek: doc.storlek,
    objekttyp: doc.objekttyp,
    antalRum: doc.antalRum,
    ledigFrom: doc.ledigFrom,
    arshyra: doc.arshyra,
    hyresreduktion: doc.hyresreduktion,
    arshyraMedRed: doc.arshyraMedRed,
    manadshyra: doc.manadshyra,
    status: doc.status,
    hidden: doc.hidden ?? false,
    kontaktperson: doc.kontaktperson,
    svarSenast: doc.svarSenast,
    hyresgastNamn: doc.hyresgastNamn,
    personnummer: doc.personnummer,
    epost: doc.epost,
    telefonnummer: doc.telefonnummer,
    kontonummer: doc.kontonummer,
    kontraktSkickatDatum: doc.kontraktSkickatDatum,
    kontraktSigneratDatum: doc.kontraktSigneratDatum,
    tillagdIHyresgastlistaDatum: doc.tillagdIHyresgastlistaDatum,
  };
}

export async function getApartmentById(id: string): Promise<Apartment> {
  const col = await getCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) throw new Error("Lägenheten hittades inte.");
  return mapDoc(doc as ApartmentDoc & { _id: ObjectId });
}

export async function getLedigaLagenheter(): Promise<Apartment[]> {
  const col = await getCollection();
  const docs = await col
    .find({ status: { $ne: "arkiverad" } })
    .sort({ ledigFrom: 1 })
    .toArray();
  return docs.map((d) => mapDoc(d as ApartmentDoc & { _id: ObjectId }));
}

export async function getRedoForKontrakt(): Promise<Apartment[]> {
  const col = await getCollection();
  const docs = await col
    .find({ status: "redo_for_kontrakt" })
    .sort({ ledigFrom: 1 })
    .toArray();
  return docs.map((d) => mapDoc(d as ApartmentDoc & { _id: ObjectId }));
}

export async function getArkiv(): Promise<Apartment[]> {
  const col = await getCollection();
  const docs = await col
    .find({ status: "arkiverad" })
    .sort({ kontraktSigneratDatum: -1 })
    .toArray();
  return docs.map((d) => mapDoc(d as ApartmentDoc & { _id: ObjectId }));
}

export async function createApartment(input: ApartmentInput): Promise<Apartment> {
  const col = await getCollection();
  const doc: ApartmentDoc = { ...input, status: "ledig", hidden: false };
  const result = await col.insertOne(doc);
  return { ...doc, id: result.insertedId.toString() };
}

export async function updateApartment(id: string, input: ApartmentInput): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: input });
}

export async function deleteApartment(id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
}

export async function setHidden(id: string, hidden: boolean): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { hidden } });
}

export async function markContacted(id: string, input: ContactInput): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: "kontaktad", kontaktperson: input.kontaktperson, svarSenast: input.svarSenast } }
  );
}

export async function assignTenantAndSendToContract(
  id: string,
  input: TenantAssignmentInput
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...input, status: "redo_for_kontrakt" } }
  );
}

export async function markContractSent(id: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { kontraktSkickatDatum: new Date().toISOString().slice(0, 10) } }
  );
}

export async function markContractSigned(id: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { kontraktSigneratDatum: new Date().toISOString().slice(0, 10) } }
  );
}

export async function archiveByLedigFrom(
  ledigFrom: string
): Promise<{ archived: number; skipped: number }> {
  const col = await getCollection();
  const candidates = await col
    .find({ status: "redo_for_kontrakt", ledigFrom })
    .toArray();
  const toArchive = candidates.filter((a) => a.kontraktSigneratDatum);
  if (toArchive.length > 0) {
    await col.updateMany(
      { _id: { $in: toArchive.map((a) => a._id) } },
      { $set: { status: "arkiverad" as ApartmentStatus } }
    );
  }
  return { archived: toArchive.length, skipped: candidates.length - toArchive.length };
}

export async function removeFromKontrakt(id: string): Promise<void> {
  const col = await getCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) throw new Error("Lägenheten hittades inte.");
  if (doc.status !== "redo_for_kontrakt") throw new Error("Lägenheten är inte redo för kontrakt.");
  if (doc.kontraktSigneratDatum) {
    throw new Error("Kontraktet är redan signerat och kan inte tas bort härifrån.");
  }
  await col.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: { status: "ledig" as ApartmentStatus },
      $unset: {
        kontaktperson: "",
        svarSenast: "",
        hyresgastNamn: "",
        personnummer: "",
        epost: "",
        telefonnummer: "",
        kontonummer: "",
        kontraktSkickatDatum: "",
        kontraktSigneratDatum: "",
      },
    }
  );
}

export async function markAddedToHyresgastlista(id: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { tillagdIHyresgastlistaDatum: new Date().toISOString().slice(0, 10) } }
  );
}

export async function findLatestApartmentSpecs(
  lagenhetsnummer: string
): Promise<ApartmentInput | null> {
  const col = await getCollection();
  const docs = await col
    .find({ lagenhetsnummer })
    .sort({ ledigFrom: -1 })
    .limit(1)
    .toArray();
  if (docs.length === 0) return null;
  const d = docs[0];
  return {
    lagenhetsnummer: d.lagenhetsnummer,
    fastighet: d.fastighet,
    storlek: d.storlek,
    objekttyp: d.objekttyp,
    antalRum: d.antalRum,
    ledigFrom: d.ledigFrom,
    arshyra: d.arshyra,
    hyresreduktion: d.hyresreduktion,
    arshyraMedRed: d.arshyraMedRed,
    manadshyra: d.manadshyra,
  };
}

// Updates pricing on all non-archived apartments matching the lagenhetsnummer.
// Called automatically when a rentalobject is updated in the Databas.
export async function syncApartmentPricingFromRentalObject(
  lagenhetsnummer: string,
  updates: Pick<ApartmentInput, "storlek" | "objekttyp" | "arshyra" | "hyresreduktion" | "arshyraMedRed" | "manadshyra">
): Promise<void> {
  const col = await getCollection();
  await col.updateMany(
    { lagenhetsnummer, status: { $ne: "arkiverad" } },
    { $set: updates }
  );
}
