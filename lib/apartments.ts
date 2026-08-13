import "server-only";
import { chunkArray, createSupabaseServerClient } from "@/lib/supabase-server";

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
  // Nation-defined free-text fields (e.g. "notes") configured via the admin
  // page — never read by any calculation, purely stored and displayed.
  custom?: Record<string, string>;
};

export type ApartmentSpecs = Omit<ApartmentInput, "lagenhetsnummer" | "ledigFrom" | "custom">;

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
  nyckelInlamnad: boolean;
  nyckelHamtad: boolean;
  custom: Record<string, string>;
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

type ApartmentRow = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  storlek: string;
  objekttyp: string;
  antal_rum: number;
  ledig_from: string;
  arshyra: number;
  hyresrabatt: number | null;
  hyresreduktion: number;
  arshyra_med_red: number;
  manadshyra: number;
  status: ApartmentStatus;
  hidden: boolean | null;
  nyckel_inlamnad: boolean | null;
  nyckel_hamtad: boolean | null;
  custom: Record<string, string> | null;
  kontaktperson: string | null;
  svar_senast: string | null;
  hyresgast_namn: string | null;
  personnummer: string | null;
  epost: string | null;
  telefonnummer: string | null;
  kontonummer: string | null;
  klart_fran_husfm_datum: string | null;
  kontrakt_skickat_datum: string | null;
  kontrakt_skickat_av: string | null;
  kontrakt_signerat_datum: string | null;
  kontrakt_signerat_av: string | null;
  tillagd_i_hyresgastlista_datum: string | null;
};

// A single non-concatenated literal, not `"a" + "b"` — supabase-js's
// .select() infers its return type from the literal string type of its
// argument; string concatenation widens to plain `string`, which breaks
// that inference and produces an untyped/error result.
const APARTMENT_COLUMNS =
  "id, lagenhetsnummer, fastighet, storlek, objekttyp, antal_rum, ledig_from, arshyra, hyresrabatt, hyresreduktion, arshyra_med_red, manadshyra, status, hidden, nyckel_inlamnad, nyckel_hamtad, custom, kontaktperson, svar_senast, hyresgast_namn, personnummer, epost, telefonnummer, kontonummer, klart_fran_husfm_datum, kontrakt_skickat_datum, kontrakt_skickat_av, kontrakt_signerat_datum, kontrakt_signerat_av, tillagd_i_hyresgastlista_datum" as const;

function mapRow(row: ApartmentRow): Apartment {
  return {
    id: row.id,
    lagenhetsnummer: row.lagenhetsnummer,
    fastighet: row.fastighet,
    storlek: row.storlek,
    objekttyp: row.objekttyp,
    antalRum: row.antal_rum,
    ledigFrom: row.ledig_from,
    arshyra: row.arshyra,
    hyresrabatt: row.hyresrabatt ?? 0,
    hyresreduktion: row.hyresreduktion,
    arshyraMedRed: row.arshyra_med_red,
    manadshyra: row.manadshyra,
    status: row.status,
    hidden: row.hidden ?? false,
    nyckelInlamnad: row.nyckel_inlamnad ?? false,
    nyckelHamtad: row.nyckel_hamtad ?? false,
    custom: row.custom ?? {},
    kontaktperson: row.kontaktperson ?? undefined,
    svarSenast: row.svar_senast ?? undefined,
    hyresgastNamn: row.hyresgast_namn ?? undefined,
    personnummer: row.personnummer ?? undefined,
    epost: row.epost ?? undefined,
    telefonnummer: row.telefonnummer ?? undefined,
    kontonummer: row.kontonummer ?? undefined,
    klartFranHusfmDatum: row.klart_fran_husfm_datum ?? undefined,
    kontraktSkickatDatum: row.kontrakt_skickat_datum ?? undefined,
    kontraktSkickatAv: row.kontrakt_skickat_av ?? undefined,
    kontraktSigneratDatum: row.kontrakt_signerat_datum ?? undefined,
    kontraktSigneratAv: row.kontrakt_signerat_av ?? undefined,
    tillagdIHyresgastlistaDatum: row.tillagd_i_hyresgastlista_datum ?? undefined,
  };
}

function specsToRow(input: ApartmentInput) {
  return {
    lagenhetsnummer: input.lagenhetsnummer,
    fastighet: input.fastighet,
    storlek: input.storlek,
    objekttyp: input.objekttyp,
    antal_rum: input.antalRum,
    ledig_from: input.ledigFrom,
    arshyra: input.arshyra,
    hyresrabatt: input.hyresrabatt,
    hyresreduktion: input.hyresreduktion,
    arshyra_med_red: input.arshyraMedRed,
    manadshyra: input.manadshyra,
    custom: input.custom ?? {},
  };
}

function tenantAssignmentToRow(input: TenantAssignmentInput) {
  return {
    hyresgast_namn: input.hyresgastNamn,
    personnummer: input.personnummer,
    epost: input.epost,
    telefonnummer: input.telefonnummer,
    kontonummer: input.kontonummer,
  };
}

export async function getApartmentById(nationsId: string, id: string): Promise<Apartment> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("apartments")
    .select(APARTMENT_COLUMNS)
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Lägenheten hittades inte.");
  return mapRow(data as ApartmentRow);
}

export async function getLedigaLagenheter(nationsId: string): Promise<Apartment[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("apartments")
    .select(APARTMENT_COLUMNS)
    .eq("nations_id", nationsId)
    .neq("status", "arkiverad")
    .order("ledig_from", { ascending: true });
  if (error) throw error;
  return (data as ApartmentRow[]).map(mapRow);
}

export async function getRedoForKontrakt(nationsId: string): Promise<Apartment[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("apartments")
    .select(APARTMENT_COLUMNS)
    .eq("nations_id", nationsId)
    .eq("status", "redo_for_kontrakt")
    .order("ledig_from", { ascending: true });
  if (error) throw error;
  return (data as ApartmentRow[]).map(mapRow);
}

// Every apartment for the nation, any status — used where a full pick-list
// is needed (e.g. manually adding a missed-rent row for any unit).
export async function getAllApartments(nationsId: string): Promise<Apartment[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("apartments")
    .select(APARTMENT_COLUMNS)
    .eq("nations_id", nationsId)
    .order("ledig_from", { ascending: false });
  if (error) throw error;
  return (data as ApartmentRow[]).map(mapRow);
}

// Any status — a missed-rent tracking row must survive the apartment
// later being archived.
export async function getApartmentsWithPastLedigFrom(
  nationsId: string,
  today: string
): Promise<Apartment[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("apartments")
    .select(APARTMENT_COLUMNS)
    .eq("nations_id", nationsId)
    .lt("ledig_from", today);
  if (error) throw error;
  return (data as ApartmentRow[]).map(mapRow);
}

export async function getApartmentsByIds(nationsId: string, ids: string[]): Promise<Apartment[]> {
  if (ids.length === 0) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("apartments")
    .select(APARTMENT_COLUMNS)
    .eq("nations_id", nationsId)
    .in("id", ids);
  if (error) throw error;
  return (data as ApartmentRow[]).map(mapRow);
}

export async function getArkiv(nationsId: string): Promise<Apartment[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("apartments")
    .select(APARTMENT_COLUMNS)
    .eq("nations_id", nationsId)
    .eq("status", "arkiverad")
    .order("kontrakt_signerat_datum", { ascending: false });
  if (error) throw error;
  return (data as ApartmentRow[]).map(mapRow);
}

// An import row can carry the same "who's interested" fields as
// saveApartmentInterest, alongside the apartment specs — a nation's kladd
// sheet often already has a name/personnummer/epost typed in per unit.
export type ApartmentImportInput = ApartmentInput & Partial<TenantAssignmentInput>;

// Upserts by lägenhetsnummer among non-archived rows, so re-running an
// import updates the current listing instead of duplicating it or touching
// archived history. Interest fields are only set when present on the row —
// a blank cell leaves whatever's already stored untouched. Pre-fetches the
// existing non-archived (lagenhetsnummer -> id) map once rather than a
// round trip per row (matches bulkUpsertTenants' rationale).
export async function bulkUpsertApartments(
  nationsId: string,
  inputs: ApartmentImportInput[]
): Promise<{ inserted: number; updated: number }> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("apartments")
    .select("id, lagenhetsnummer")
    .eq("nations_id", nationsId)
    .neq("status", "arkiverad");
  if (findError) throw findError;
  const existingByLagenhetsnummer = new Map(
    (existing as { id: string; lagenhetsnummer: string }[]).map((r) => [r.lagenhetsnummer, r.id])
  );

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: Record<string, unknown>[] = [];
  for (const input of inputs) {
    const { hyresgastNamn, personnummer, epost, telefonnummer, kontonummer, ...specs } = input;
    const interest: Record<string, string> = {};
    if (hyresgastNamn) interest.hyresgast_namn = hyresgastNamn;
    if (personnummer) interest.personnummer = personnummer;
    if (epost) interest.epost = epost;
    if (telefonnummer) interest.telefonnummer = telefonnummer;
    if (kontonummer) interest.kontonummer = kontonummer;

    const existingId = existingByLagenhetsnummer.get(input.lagenhetsnummer);
    if (existingId) {
      toUpdate.push({ id: existingId, ...specsToRow(specs), ...interest });
    } else {
      toInsert.push({
        nations_id: nationsId,
        ...specsToRow(specs),
        ...interest,
        status: "ledig",
        hidden: false,
        nyckel_inlamnad: false,
        nyckel_hamtad: false,
      });
    }
  }

  // Batched per chunk for speed; on a chunk failure, fall back to writing
  // that chunk's rows one at a time (same behavior as before this change —
  // throws on the first bad row) so a single bad row's blast radius is
  // limited to its own chunk instead of the whole import, without silently
  // skipping rows that were never actually validated as safe to skip.
  for (const rows of chunkArray(toInsert)) {
    const { error } = await supabase.from("apartments").insert(rows);
    if (!error) continue;
    for (const row of rows) {
      const { error: rowError } = await supabase.from("apartments").insert(row);
      if (rowError) throw rowError;
    }
  }
  for (const rows of chunkArray(toUpdate)) {
    const { error } = await supabase.from("apartments").upsert(rows, { onConflict: "id" });
    if (!error) continue;
    for (const row of rows) {
      const { id, ...rest } = row;
      const { error: rowError } = await supabase.from("apartments").update(rest).eq("id", id as string);
      if (rowError) throw rowError;
    }
  }
  return { inserted: toInsert.length, updated: toUpdate.length };
}

export async function createApartment(nationsId: string, input: ApartmentInput): Promise<Apartment> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("apartments")
    .insert({
      nations_id: nationsId,
      ...specsToRow(input),
      status: "ledig",
      hidden: false,
      nyckel_inlamnad: false,
      nyckel_hamtad: false,
    })
    .select(APARTMENT_COLUMNS)
    .single();
  if (error) throw error;
  return mapRow(data as ApartmentRow);
}

export async function updateApartment(nationsId: string, id: string, input: ApartmentInput): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("apartments")
    .update(specsToRow(input))
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function deleteApartment(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("apartments")
    .delete()
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function setHidden(nationsId: string, id: string, hidden: boolean): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("apartments")
    .update({ hidden })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

// Turning "inlämnad" back off implies the key can't be "hämtad" either.
export async function setNyckelInlamnad(nationsId: string, id: string, value: boolean): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("apartments")
    .update(value ? { nyckel_inlamnad: true } : { nyckel_inlamnad: false, nyckel_hamtad: false })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function setNyckelHamtad(nationsId: string, id: string, value: boolean): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data, error: findError } = await supabase
    .from("apartments")
    .select("nyckel_inlamnad")
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  if (!data) throw new Error("Lägenheten hittades inte.");
  if (value && !data.nyckel_inlamnad) {
    throw new Error("Nyckeln måste vara inlämnad innan den kan hämtas.");
  }
  const { error } = await supabase
    .from("apartments")
    .update({ nyckel_hamtad: value })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function markContacted(nationsId: string, id: string, input: ContactInput): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("apartments")
    .update({ status: "kontaktad", kontaktperson: input.kontaktperson, svar_senast: input.svarSenast })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function assignTenantAndSendToContract(
  nationsId: string,
  id: string,
  input: TenantAssignmentInput
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("apartments")
    .update({
      ...tenantAssignmentToRow(input),
      status: "redo_for_kontrakt",
      klart_fran_husfm_datum: new Date().toISOString().slice(0, 10),
    })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

// Persists whatever tenant-interest fields are currently filled in, without
// requiring completeness and without touching status — lets a partial
// "interested person" entry be saved before all contract fields are ready.
export async function saveApartmentInterest(
  nationsId: string,
  id: string,
  input: TenantAssignmentInput
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("apartments")
    .update(tenantAssignmentToRow(input))
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function markContractSent(nationsId: string, id: string, utfordAv: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("apartments")
    .update({ kontrakt_skickat_datum: new Date().toISOString().slice(0, 10), kontrakt_skickat_av: utfordAv })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function markContractSigned(nationsId: string, id: string, utfordAv: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("apartments")
    .update({ kontrakt_signerat_datum: new Date().toISOString().slice(0, 10), kontrakt_signerat_av: utfordAv })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function archiveByLedigFrom(
  nationsId: string,
  ledigFrom: string
): Promise<{ archived: number; skipped: number }> {
  const supabase = createSupabaseServerClient();
  const { data: candidates, error: findError } = await supabase
    .from("apartments")
    .select("id, kontrakt_signerat_datum")
    .eq("nations_id", nationsId)
    .eq("status", "redo_for_kontrakt")
    .eq("ledig_from", ledigFrom);
  if (findError) throw findError;
  const rows = candidates as { id: string; kontrakt_signerat_datum: string | null }[];
  const toArchive = rows.filter((a) => a.kontrakt_signerat_datum);
  if (toArchive.length > 0) {
    const { error } = await supabase
      .from("apartments")
      .update({ status: "arkiverad" })
      .in("id", toArchive.map((a) => a.id));
    if (error) throw error;
  }
  return { archived: toArchive.length, skipped: rows.length - toArchive.length };
}

export async function removeFromKontrakt(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data, error: findError } = await supabase
    .from("apartments")
    .select("status, kontrakt_signerat_datum")
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  if (!data) throw new Error("Lägenheten hittades inte.");
  if (data.status !== "redo_for_kontrakt") throw new Error("Lägenheten är inte redo för kontrakt.");
  if (data.kontrakt_signerat_datum) {
    throw new Error("Kontraktet är redan signerat och kan inte tas bort härifrån.");
  }
  const { error } = await supabase
    .from("apartments")
    .update({
      status: "ledig",
      kontaktperson: null,
      svar_senast: null,
      hyresgast_namn: null,
      personnummer: null,
      epost: null,
      telefonnummer: null,
      kontonummer: null,
      klart_fran_husfm_datum: null,
      kontrakt_skickat_datum: null,
      kontrakt_skickat_av: null,
      kontrakt_signerat_datum: null,
      kontrakt_signerat_av: null,
    })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function markAddedToHyresgastlista(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("apartments")
    .update({ tillagd_i_hyresgastlista_datum: new Date().toISOString().slice(0, 10) })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function findLatestApartmentSpecs(
  nationsId: string,
  lagenhetsnummer: string
): Promise<ApartmentInput | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("apartments")
    .select("lagenhetsnummer, fastighet, storlek, objekttyp, antal_rum, ledig_from, arshyra, hyresrabatt, hyresreduktion, arshyra_med_red, manadshyra")
    .eq("nations_id", nationsId)
    .eq("lagenhetsnummer", lagenhetsnummer)
    .order("ledig_from", { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const d = data[0];
  return {
    lagenhetsnummer: d.lagenhetsnummer,
    fastighet: d.fastighet,
    storlek: d.storlek,
    objekttyp: d.objekttyp,
    antalRum: d.antal_rum,
    ledigFrom: d.ledig_from,
    arshyra: d.arshyra,
    hyresrabatt: d.hyresrabatt ?? 0,
    hyresreduktion: d.hyresreduktion,
    arshyraMedRed: d.arshyra_med_red,
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
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("apartments")
    .update({
      storlek: updates.storlek,
      objekttyp: updates.objekttyp,
      arshyra: updates.arshyra,
      hyresrabatt: updates.hyresrabatt,
      hyresreduktion: updates.hyresreduktion,
      arshyra_med_red: updates.arshyraMedRed,
      manadshyra: updates.manadshyra,
    })
    .eq("nations_id", nationsId)
    .eq("lagenhetsnummer", lagenhetsnummer)
    .neq("status", "arkiverad");
  if (error) throw error;
}
