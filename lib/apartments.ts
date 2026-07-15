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
  hyresrabatt: number;
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
  klartFranHusfmDatum?: string;
  kontraktSkickatDatum?: string;
  kontraktSkickatAv?: string;
  kontraktSigneratDatum?: string;
  kontraktSigneratAv?: string;
  tillagdIHyresgastlistaDatum?: string;
};

type ApartmentDoc = Omit<Apartment, "id"> & { nationsID: string };

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
    hyresrabatt: doc.hyresrabatt ?? 0,
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
    klartFranHusfmDatum: doc.klartFranHusfmDatum,
    kontraktSkickatDatum: doc.kontraktSkickatDatum,
    kontraktSkickatAv: doc.kontraktSkickatAv,
    kontraktSigneratDatum: doc.kontraktSigneratDatum,
    kontraktSigneratAv: doc.kontraktSigneratAv,
    tillagdIHyresgastlistaDatum: doc.tillagdIHyresgastlistaDatum,
  };
}

export async function getApartmentById(nationsId: string, id: string): Promise<Apartment> {
  const col = await getCollection();
  const doc = await col.findOne({ _id: new ObjectId(id), nationsID: nationsId });
  if (!doc) throw new Error("Lägenheten hittades inte.");
  return mapDoc(doc as ApartmentDoc & { _id: ObjectId });
}

export async function getLedigaLagenheter(nationsId: string): Promise<Apartment[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId, status: { $ne: "arkiverad" } })
    .sort({ ledigFrom: 1 })
    .toArray();
  return docs.map((d) => mapDoc(d as ApartmentDoc & { _id: ObjectId }));
}

export async function getRedoForKontrakt(nationsId: string): Promise<Apartment[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId, status: "redo_for_kontrakt" })
    .sort({ ledigFrom: 1 })
    .toArray();
  return docs.map((d) => mapDoc(d as ApartmentDoc & { _id: ObjectId }));
}

// Every apartment for the nation, any status — used where a full pick-list
// is needed (e.g. manually adding a missed-rent row for any unit).
export async function getAllApartments(nationsId: string): Promise<Apartment[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId })
    .sort({ ledigFrom: -1 })
    .toArray();
  return docs.map((d) => mapDoc(d as ApartmentDoc & { _id: ObjectId }));
}

// Any status — a missed-rent tracking row must survive the apartment
// later being archived.
export async function getApartmentsWithPastLedigFrom(
  nationsId: string,
  today: string
): Promise<Apartment[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId, ledigFrom: { $lt: today } })
    .toArray();
  return docs.map((d) => mapDoc(d as ApartmentDoc & { _id: ObjectId }));
}

export async function getApartmentsByIds(nationsId: string, ids: string[]): Promise<Apartment[]> {
  if (ids.length === 0) return [];
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId, _id: { $in: ids.map((id) => new ObjectId(id)) } })
    .toArray();
  return docs.map((d) => mapDoc(d as ApartmentDoc & { _id: ObjectId }));
}

export async function getArkiv(nationsId: string): Promise<Apartment[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId, status: "arkiverad" })
    .sort({ kontraktSigneratDatum: -1 })
    .toArray();
  return docs.map((d) => mapDoc(d as ApartmentDoc & { _id: ObjectId }));
}

export async function createApartment(nationsId: string, input: ApartmentInput): Promise<Apartment> {
  const col = await getCollection();
  const doc: ApartmentDoc = { ...input, nationsID: nationsId, status: "ledig", hidden: false };
  const result = await col.insertOne(doc);
  return { ...doc, id: result.insertedId.toString() };
}

export async function updateApartment(nationsId: string, id: string, input: ApartmentInput): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id), nationsID: nationsId }, { $set: input });
}

export async function deleteApartment(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ _id: new ObjectId(id), nationsID: nationsId });
}

export async function setHidden(nationsId: string, id: string, hidden: boolean): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id), nationsID: nationsId }, { $set: { hidden } });
}

export async function markContacted(nationsId: string, id: string, input: ContactInput): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { status: "kontaktad", kontaktperson: input.kontaktperson, svarSenast: input.svarSenast } }
  );
}

export async function assignTenantAndSendToContract(
  nationsId: string,
  id: string,
  input: TenantAssignmentInput
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    {
      $set: {
        ...input,
        status: "redo_for_kontrakt",
        klartFranHusfmDatum: new Date().toISOString().slice(0, 10),
      },
    }
  );
}

// Persists whatever tenant-interest fields are currently filled in, without
// requiring completeness and without touching status — lets a partial
// "interested person" entry be saved before all contract fields are ready.
export async function saveApartmentInterest(
  nationsId: string,
  id: string,
  input: TenantAssignmentInput
): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id), nationsID: nationsId }, { $set: input });
}

export async function markContractSent(nationsId: string, id: string, utfordAv: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { kontraktSkickatDatum: new Date().toISOString().slice(0, 10), kontraktSkickatAv: utfordAv } }
  );
}

export async function markContractSigned(nationsId: string, id: string, utfordAv: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { kontraktSigneratDatum: new Date().toISOString().slice(0, 10), kontraktSigneratAv: utfordAv } }
  );
}

export async function archiveByLedigFrom(
  nationsId: string,
  ledigFrom: string
): Promise<{ archived: number; skipped: number }> {
  const col = await getCollection();
  const candidates = await col
    .find({ nationsID: nationsId, status: "redo_for_kontrakt", ledigFrom })
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

export async function removeFromKontrakt(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  const doc = await col.findOne({ _id: new ObjectId(id), nationsID: nationsId });
  if (!doc) throw new Error("Lägenheten hittades inte.");
  if (doc.status !== "redo_for_kontrakt") throw new Error("Lägenheten är inte redo för kontrakt.");
  if (doc.kontraktSigneratDatum) {
    throw new Error("Kontraktet är redan signerat och kan inte tas bort härifrån.");
  }
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
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
        klartFranHusfmDatum: "",
        kontraktSkickatDatum: "",
        kontraktSkickatAv: "",
        kontraktSigneratDatum: "",
        kontraktSigneratAv: "",
      },
    }
  );
}

export async function markAddedToHyresgastlista(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { tillagdIHyresgastlistaDatum: new Date().toISOString().slice(0, 10) } }
  );
}

export async function findLatestApartmentSpecs(
  nationsId: string,
  lagenhetsnummer: string
): Promise<ApartmentInput | null> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId, lagenhetsnummer })
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
    hyresrabatt: d.hyresrabatt ?? 0,
    hyresreduktion: d.hyresreduktion,
    arshyraMedRed: d.arshyraMedRed,
    manadshyra: d.manadshyra,
  };
}

// Updates pricing on all non-archived apartments matching the lagenhetsnummer.
// Called automatically when a rentalobject is updated in the Databas.
export async function syncApartmentPricingFromRentalObject(
  nationsId: string,
  lagenhetsnummer: string,
  updates: Pick<ApartmentInput, "storlek" | "objekttyp" | "arshyra" | "hyresrabatt" | "hyresreduktion" | "arshyraMedRed" | "manadshyra">
): Promise<void> {
  const col = await getCollection();
  await col.updateMany(
    { nationsID: nationsId, lagenhetsnummer, status: { $ne: "arkiverad" } },
    { $set: updates }
  );
}
