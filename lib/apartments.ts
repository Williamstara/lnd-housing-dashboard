import "server-only";
import { randomUUID } from "node:crypto";
import { FASTIGHETER } from "@/lib/fastigheter";

// --- Mock data store -------------------------------------------------
// This stands in for a real database until the apartment workflow is
// wired up to Mongo. It lives in module-level state, cached on
// globalThis so it survives dev-mode hot reloads (same trick as
// lib/mongodb.ts's client cache). It resets when the server restarts.

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
  ledigFrom: string; // ISO date (yyyy-mm-dd)
  arshyra: number;
  hyresreduktion: number;
  arshyraMedRed: number;
  manadshyra: number;
};

export type ContactInput = {
  kontaktperson: string;
  svarSenast: string; // ISO date
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

function seedApartments(): Apartment[] {
  return [
    {
      id: randomUUID(),
      lagenhetsnummer: "A1001",
      fastighet: FASTIGHETER[0],
      storlek: "42 m²",
      objekttyp: "Lägenhet",
      antalRum: 2,
      ledigFrom: "2026-08-01",
      arshyra: 96000,
      hyresreduktion: 0,
      arshyraMedRed: 96000,
      manadshyra: 8000,
      status: "ledig",
      hidden: false,
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "B2014",
      fastighet: FASTIGHETER[1],
      storlek: "65 m²",
      objekttyp: "Lägenhet",
      antalRum: 3,
      ledigFrom: "2026-09-01",
      arshyra: 132000,
      hyresreduktion: 6000,
      arshyraMedRed: 126000,
      manadshyra: 10500,
      status: "kontaktad",
      hidden: false,
      kontaktperson: "Erik Svensson",
      svarSenast: "2026-07-25",
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "C3007",
      fastighet: FASTIGHETER[2],
      storlek: "28 m²",
      objekttyp: "Lägenhet",
      antalRum: 1,
      ledigFrom: "2026-07-20",
      arshyra: 72000,
      hyresreduktion: 0,
      arshyraMedRed: 72000,
      manadshyra: 6000,
      status: "redo_for_kontrakt",
      hidden: false,
      hyresgastNamn: "Maria Andersson",
      personnummer: "19900101-1234",
      epost: "maria.andersson@example.com",
      telefonnummer: "0701234567",
      kontonummer: "1234-5,678 90 123",
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "A1002",
      fastighet: FASTIGHETER[0],
      storlek: "55 m²",
      objekttyp: "Lägenhet",
      antalRum: 2,
      ledigFrom: "2026-06-01",
      arshyra: 114000,
      hyresreduktion: 0,
      arshyraMedRed: 114000,
      manadshyra: 9500,
      status: "arkiverad",
      hidden: false,
      hyresgastNamn: "Johan Lindqvist",
      personnummer: "19851212-5678",
      epost: "johan.lindqvist@example.com",
      telefonnummer: "0709876543",
      kontonummer: "5432-1,098 76 543",
      kontraktSkickatDatum: "2026-05-10",
      kontraktSigneratDatum: "2026-05-18",
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "D4021",
      fastighet: FASTIGHETER[3],
      storlek: "38 m²",
      objekttyp: "Lägenhet",
      antalRum: 1,
      ledigFrom: "2026-07-15",
      arshyra: 84000,
      hyresreduktion: 0,
      arshyraMedRed: 84000,
      manadshyra: 7000,
      status: "ledig",
      hidden: false,
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "D4022",
      fastighet: FASTIGHETER[3],
      storlek: "38 m²",
      objekttyp: "Lägenhet",
      antalRum: 1,
      ledigFrom: "2026-07-15",
      arshyra: 84000,
      hyresreduktion: 3000,
      arshyraMedRed: 81000,
      manadshyra: 6750,
      status: "ledig",
      hidden: true,
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "B2015",
      fastighet: FASTIGHETER[1],
      storlek: "72 m²",
      objekttyp: "Lägenhet",
      antalRum: 3,
      ledigFrom: "2026-08-01",
      arshyra: 144000,
      hyresreduktion: 0,
      arshyraMedRed: 144000,
      manadshyra: 12000,
      status: "kontaktad",
      hidden: false,
      kontaktperson: "Sara Nilsson",
      svarSenast: "2026-07-30",
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "C3008",
      fastighet: FASTIGHETER[2],
      storlek: "31 m²",
      objekttyp: "Lägenhet",
      antalRum: 1,
      ledigFrom: "2026-08-01",
      arshyra: 78000,
      hyresreduktion: 0,
      arshyraMedRed: 78000,
      manadshyra: 6500,
      status: "kontaktad",
      hidden: false,
      kontaktperson: "Oskar Bergström",
      svarSenast: "2026-08-05",
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "A1003",
      fastighet: FASTIGHETER[0],
      storlek: "48 m²",
      objekttyp: "Lägenhet",
      antalRum: 2,
      ledigFrom: "2026-09-01",
      arshyra: 102000,
      hyresreduktion: 0,
      arshyraMedRed: 102000,
      manadshyra: 8500,
      status: "redo_for_kontrakt",
      hidden: false,
      hyresgastNamn: "Linnea Karlsson",
      personnummer: "19930304-2345",
      epost: "linnea.karlsson@example.com",
      telefonnummer: "0704455667",
      kontonummer: "9988-7,654 32 109",
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "B2016",
      fastighet: FASTIGHETER[1],
      storlek: "58 m²",
      objekttyp: "Lägenhet",
      antalRum: 2,
      ledigFrom: "2026-09-01",
      arshyra: 120000,
      hyresreduktion: 0,
      arshyraMedRed: 120000,
      manadshyra: 10000,
      status: "redo_for_kontrakt",
      hidden: false,
      hyresgastNamn: "Anders Pettersson",
      personnummer: "19781122-6789",
      epost: "anders.pettersson@example.com",
      telefonnummer: "0709112233",
      kontonummer: "1111-2,222 33 444",
      kontraktSkickatDatum: "2026-07-28",
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "D4023",
      fastighet: FASTIGHETER[3],
      storlek: "44 m²",
      objekttyp: "Lägenhet",
      antalRum: 2,
      ledigFrom: "2026-07-01",
      arshyra: 90000,
      hyresreduktion: 0,
      arshyraMedRed: 90000,
      manadshyra: 7500,
      // Signed but not yet archived — stays visible on Redo för kontrakt
      // until archived manually (e.g. via "Arkivera med flyttdatum").
      status: "redo_for_kontrakt",
      hidden: false,
      hyresgastNamn: "Emma Holm",
      personnummer: "19961007-3456",
      epost: "emma.holm@example.com",
      telefonnummer: "0706677889",
      kontonummer: "3344-5,566 77 888",
      kontraktSkickatDatum: "2026-06-15",
      kontraktSigneratDatum: "2026-06-22",
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "C3009",
      fastighet: FASTIGHETER[2],
      storlek: "26 m²",
      objekttyp: "Lägenhet",
      antalRum: 1,
      ledigFrom: "2026-05-01",
      arshyra: 70000,
      hyresreduktion: 0,
      arshyraMedRed: 70000,
      manadshyra: 5833,
      status: "arkiverad",
      hidden: false,
      hyresgastNamn: "Sofia Ekberg",
      personnummer: "19880815-4567",
      epost: "sofia.ekberg@example.com",
      telefonnummer: "0703344556",
      kontonummer: "6677-8,899 00 111",
      kontraktSkickatDatum: "2026-04-05",
      kontraktSigneratDatum: "2026-04-12",
      tillagdIHyresgastlistaDatum: "2026-04-13",
    },
    {
      id: randomUUID(),
      lagenhetsnummer: "A1004",
      fastighet: FASTIGHETER[0],
      storlek: "63 m²",
      objekttyp: "Lokal",
      antalRum: 2,
      ledigFrom: "2026-10-01",
      arshyra: 156000,
      hyresreduktion: 12000,
      arshyraMedRed: 144000,
      manadshyra: 12000,
      status: "ledig",
      hidden: false,
    },
  ];
}

const globalStore = globalThis as typeof globalThis & {
  _apartmentsStore?: Apartment[];
};

function getStore(): Apartment[] {
  if (!globalStore._apartmentsStore) {
    globalStore._apartmentsStore = seedApartments();
  }
  return globalStore._apartmentsStore;
}

function findOrThrow(id: string): Apartment {
  const apartment = getStore().find((item) => item.id === id);
  if (!apartment) {
    throw new Error("Lägenheten hittades inte.");
  }
  return apartment;
}

export async function getApartmentById(id: string): Promise<Apartment> {
  return findOrThrow(id);
}

// Everything that isn't archived stays visible here — regardless of
// contact/assignment progress — until explicitly hidden or archived, so
// nothing silently drops off the list mid-month.
export async function getLedigaLagenheter(): Promise<Apartment[]> {
  return getStore()
    .filter((a) => a.status !== "arkiverad")
    .slice()
    .sort((a, b) => a.ledigFrom.localeCompare(b.ledigFrom));
}

export async function getRedoForKontrakt(): Promise<Apartment[]> {
  return getStore()
    .filter((a) => a.status === "redo_for_kontrakt")
    .slice()
    .sort((a, b) => a.ledigFrom.localeCompare(b.ledigFrom));
}

export async function getArkiv(): Promise<Apartment[]> {
  return getStore()
    .filter((a) => a.status === "arkiverad")
    .slice()
    .sort((a, b) =>
      (b.kontraktSigneratDatum ?? "").localeCompare(a.kontraktSigneratDatum ?? "")
    );
}

export async function createApartment(
  input: ApartmentInput
): Promise<Apartment> {
  const apartment: Apartment = {
    ...input,
    id: randomUUID(),
    status: "ledig",
    hidden: false,
  };
  getStore().push(apartment);
  return apartment;
}

export async function updateApartment(
  id: string,
  input: ApartmentInput
): Promise<void> {
  const apartment = findOrThrow(id);
  Object.assign(apartment, input);
}

export async function deleteApartment(id: string): Promise<void> {
  const store = getStore();
  const index = store.findIndex((item) => item.id === id);
  if (index !== -1) {
    store.splice(index, 1);
  }
}

export async function setHidden(id: string, hidden: boolean): Promise<void> {
  const apartment = findOrThrow(id);
  apartment.hidden = hidden;
}

// Also used to switch to a different candidate for the same apartment
// (e.g. the first person declines) — it just overwrites the contact
// fields, regardless of whether the apartment was "ledig" or already
// "kontaktad".
export async function markContacted(
  id: string,
  input: ContactInput
): Promise<void> {
  const apartment = findOrThrow(id);
  apartment.status = "kontaktad";
  apartment.kontaktperson = input.kontaktperson;
  apartment.svarSenast = input.svarSenast;
}

export async function assignTenantAndSendToContract(
  id: string,
  input: TenantAssignmentInput
): Promise<void> {
  const apartment = findOrThrow(id);
  Object.assign(apartment, input);
  apartment.status = "redo_for_kontrakt";
}

export async function markContractSent(id: string): Promise<void> {
  const apartment = findOrThrow(id);
  apartment.kontraktSkickatDatum = new Date().toISOString().slice(0, 10);
}

// Only records the signed date — the apartment stays in "redo_for_kontrakt"
// (visible on Redo för kontrakt) until it's archived explicitly, either via
// archiveByLedigFrom or a future single-row archive action.
export async function markContractSigned(id: string): Promise<void> {
  const apartment = findOrThrow(id);
  apartment.kontraktSigneratDatum = new Date().toISOString().slice(0, 10);
}

// Archives "redo_for_kontrakt" apartments whose move-in date matches
// exactly, for clearing out a whole month cluster at once. Only apartments
// with a signed contract are archived — anything still waiting on a
// signature is left in place so it doesn't silently disappear. Returns
// how many were archived and how many matched the date but were skipped
// for not being signed yet.
export async function archiveByLedigFrom(
  ledigFrom: string
): Promise<{ archived: number; skipped: number }> {
  const candidates = getStore().filter(
    (a) => a.status === "redo_for_kontrakt" && a.ledigFrom === ledigFrom
  );
  const matches = candidates.filter((a) => a.kontraktSigneratDatum);
  for (const apartment of matches) {
    apartment.status = "arkiverad";
  }
  return { archived: matches.length, skipped: candidates.length - matches.length };
}

// Undoes an accidental "skicka till kontrakt" — reverts the apartment back
// to "ledig" and clears the tenant/contract fields, so it's immediately
// available again on Lediga lägenheter. Blocked once the contract is
// signed, since that's a completed state that shouldn't be wiped silently;
// use archiving for those instead.
export async function removeFromKontrakt(id: string): Promise<void> {
  const apartment = findOrThrow(id);
  if (apartment.status !== "redo_for_kontrakt") {
    throw new Error("Lägenheten är inte redo för kontrakt.");
  }
  if (apartment.kontraktSigneratDatum) {
    throw new Error(
      "Kontraktet är redan signerat och kan inte tas bort härifrån."
    );
  }
  apartment.status = "ledig";
  delete apartment.kontaktperson;
  delete apartment.svarSenast;
  delete apartment.hyresgastNamn;
  delete apartment.personnummer;
  delete apartment.epost;
  delete apartment.telefonnummer;
  delete apartment.kontonummer;
  delete apartment.kontraktSkickatDatum;
  delete apartment.kontraktSigneratDatum;
}

export async function markAddedToHyresgastlista(id: string): Promise<void> {
  const apartment = findOrThrow(id);
  apartment.tillagdIHyresgastlistaDatum = new Date().toISOString().slice(0, 10);
}

// Looks up the most recent record (any status) for this apartment number
// so a termination ("uppsägning") can reuse its size/rent instead of
// asking ekonomi to re-type specs that haven't changed. Returns null if
// the apartment number has never appeared in the store before.
export async function findLatestApartmentSpecs(
  lagenhetsnummer: string
): Promise<ApartmentInput | null> {
  const matches = getStore()
    .filter((a) => a.lagenhetsnummer === lagenhetsnummer)
    .sort((a, b) => b.ledigFrom.localeCompare(a.ledigFrom));
  const latest = matches[0];
  if (!latest) return null;

  const {
    fastighet,
    storlek,
    objekttyp,
    antalRum,
    arshyra,
    hyresreduktion,
    arshyraMedRed,
    manadshyra,
  } = latest;
  return {
    lagenhetsnummer,
    fastighet,
    storlek,
    objekttyp,
    antalRum,
    ledigFrom: latest.ledigFrom,
    arshyra,
    hyresreduktion,
    arshyraMedRed,
    manadshyra,
  };
}
