import "server-only";
import { chunkArray, createSupabaseServerClient } from "@/lib/supabase-server";

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

type BesiktningRow = {
  id: string;
  lagenhetsnummer: string;
  besiktningsdatum: string;
  kostnad_stadning: number;
  vaktmastare_anteckning: string | null;
  godkand: boolean | null;
  husforman_anteckning: string | null;
  ovriga_anteckningar: string | null;
  totalt_avdrag: number;
  klar_for_betalning_datum: string | null;
  klar_for_betalning_av: string | null;
  betalning_gjord_datum: string | null;
  betalning_gjord_av: string | null;
  status: BesiktningStatus;
};

const BESIKTNING_COLUMNS =
  "id, lagenhetsnummer, besiktningsdatum, kostnad_stadning, vaktmastare_anteckning, godkand, husforman_anteckning, ovriga_anteckningar, totalt_avdrag, klar_for_betalning_datum, klar_for_betalning_av, betalning_gjord_datum, betalning_gjord_av, status" as const;

function mapRow(row: BesiktningRow): Besiktning {
  return {
    id: row.id,
    lagenhetsnummer: row.lagenhetsnummer,
    besiktningsdatum: row.besiktningsdatum,
    kostnadStadning: row.kostnad_stadning,
    vaktmastareAnteckning: row.vaktmastare_anteckning ?? "",
    godkand: row.godkand,
    husformanAnteckning: row.husforman_anteckning ?? "",
    ovrigaAnteckningar: row.ovriga_anteckningar ?? "",
    totaltAvdrag: row.totalt_avdrag,
    klarForBetalningDatum: row.klar_for_betalning_datum,
    klarForBetalningAv: row.klar_for_betalning_av ?? null,
    betalningGjordDatum: row.betalning_gjord_datum,
    betalningGjordAv: row.betalning_gjord_av ?? null,
    status: row.status,
  };
}

function editInputToRow(input: BesiktningEditInput) {
  return {
    besiktningsdatum: input.besiktningsdatum,
    kostnad_stadning: input.kostnadStadning,
    vaktmastare_anteckning: input.vaktmastareAnteckning,
    godkand: input.godkand,
    husforman_anteckning: input.husformanAnteckning,
    ovriga_anteckningar: input.ovrigaAnteckningar,
    totalt_avdrag: input.totaltAvdrag,
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
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("besiktningar")
    .select(BESIKTNING_COLUMNS)
    .eq("nations_id", nationsId)
    .neq("status", "arkiverad")
    .order("besiktningsdatum", { ascending: true });
  if (error) throw error;
  return (data as BesiktningRow[]).map(mapRow);
}

export async function getArkiveradeBesiktningar(nationsId: string): Promise<Besiktning[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("besiktningar")
    .select(BESIKTNING_COLUMNS)
    .eq("nations_id", nationsId)
    .eq("status", "arkiverad")
    .order("besiktningsdatum", { ascending: false });
  if (error) throw error;
  return (data as BesiktningRow[]).map(mapRow);
}

// Called when a lease termination is confirmed and the apartment is
// re-listed with a new move-in date — creates the follow-up besiktning row
// with just lägenhetsnummer set, dated the workday before that move-in date.
export async function createBesiktning(
  nationsId: string,
  lagenhetsnummer: string,
  nyttInflyttningsdatum: string
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("besiktningar").insert({
    nations_id: nationsId,
    lagenhetsnummer,
    besiktningsdatum: previousWorkday(nyttInflyttningsdatum),
    kostnad_stadning: 0,
    vaktmastare_anteckning: "",
    godkand: null,
    husforman_anteckning: "",
    ovriga_anteckningar: "",
    totalt_avdrag: 0,
    klar_for_betalning_datum: null,
    klar_for_betalning_av: null,
    betalning_gjord_datum: null,
    betalning_gjord_av: null,
    status: "aktiv",
  });
  if (error) throw error;
}

export async function createManualBesiktning(
  nationsId: string,
  input: BesiktningImportInput
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("besiktningar").insert({
    nations_id: nationsId,
    lagenhetsnummer: input.lagenhetsnummer,
    ...editInputToRow(input),
    klar_for_betalning_datum: null,
    klar_for_betalning_av: null,
    betalning_gjord_datum: null,
    betalning_gjord_av: null,
    status: "aktiv",
  });
  if (error) throw error;
}

export async function updateBesiktning(
  nationsId: string,
  id: string,
  input: BesiktningEditInput
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("besiktningar")
    .update(editInputToRow(input))
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function markKlarForBetalning(nationsId: string, id: string, utfordAv: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("besiktningar")
    .update({ klar_for_betalning_datum: new Date().toISOString().slice(0, 10), klar_for_betalning_av: utfordAv })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function markBetalningGjord(nationsId: string, id: string, utfordAv: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("besiktningar")
    .update({ betalning_gjord_datum: new Date().toISOString().slice(0, 10), betalning_gjord_av: utfordAv })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export type BulkActionResult = { updated: number; skipped: number };

// Only touches rows not already marked, so re-running over an overlapping
// selection is harmless — already-marked rows are simply counted as skipped
// rather than having their date/utfordAv overwritten. `.select("id")` after
// the update returns exactly the rows that matched every filter (including
// the not-already-marked one), giving an accurate modified count the same
// way Mongo's `result.modifiedCount` did.
export async function markKlarForBetalningBulk(
  nationsId: string,
  ids: string[],
  utfordAv: string
): Promise<BulkActionResult> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("besiktningar")
    .update({ klar_for_betalning_datum: new Date().toISOString().slice(0, 10), klar_for_betalning_av: utfordAv })
    .eq("nations_id", nationsId)
    .in("id", ids)
    .is("klar_for_betalning_datum", null)
    .select("id");
  if (error) throw error;
  const updated = (data as { id: string }[]).length;
  return { updated, skipped: ids.length - updated };
}

// Mirrors the single-row rule (payment can't be marked done before it's
// marked ready) — rows missing klarForBetalningDatum are skipped, not errored.
export async function markBetalningGjordBulk(
  nationsId: string,
  ids: string[],
  utfordAv: string
): Promise<BulkActionResult> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("besiktningar")
    .update({ betalning_gjord_datum: new Date().toISOString().slice(0, 10), betalning_gjord_av: utfordAv })
    .eq("nations_id", nationsId)
    .in("id", ids)
    .not("klar_for_betalning_datum", "is", null)
    .is("betalning_gjord_datum", null)
    .select("id");
  if (error) throw error;
  const updated = (data as { id: string }[]).length;
  return { updated, skipped: ids.length - updated };
}

// Mirrors archiveBesiktning's rule (payment must be done first) but skips
// ineligible rows instead of throwing, since a bulk selection commonly mixes
// ready and not-yet-ready rows.
export async function archiveBesiktningarBulk(nationsId: string, ids: string[]): Promise<BulkActionResult> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("besiktningar")
    .update({ status: "arkiverad" })
    .eq("nations_id", nationsId)
    .in("id", ids)
    .not("betalning_gjord_datum", "is", null)
    .neq("status", "arkiverad")
    .select("id");
  if (error) throw error;
  const updated = (data as { id: string }[]).length;
  return { updated, skipped: ids.length - updated };
}

// Upserts one row per (lägenhetsnummer, besiktningsdatum) among non-archived
// besiktningar — matches an existing row from the Excel import and updates
// it, or creates a new "aktiv" row if none matches. No DB-level unique
// constraint backs this (matches Mongo's original filter-based upsert, not a
// real unique index), so it's a pre-fetched map + per-row insert/update,
// same shape as bulkUpsertApartments.
export async function bulkUpsertBesiktningar(
  nationsId: string,
  inputs: BesiktningImportInput[]
): Promise<BulkUpsertResult> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("besiktningar")
    .select("id, lagenhetsnummer, besiktningsdatum")
    .eq("nations_id", nationsId)
    .neq("status", "arkiverad");
  if (findError) throw findError;
  const existingByKey = new Map(
    (existing as { id: string; lagenhetsnummer: string; besiktningsdatum: string }[]).map((r) => [
      `${r.lagenhetsnummer}|${r.besiktningsdatum}`,
      r.id,
    ])
  );

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: Record<string, unknown>[] = [];
  for (const input of inputs) {
    const existingId = existingByKey.get(`${input.lagenhetsnummer}|${input.besiktningsdatum}`);
    if (existingId) {
      toUpdate.push({ id: existingId, ...editInputToRow(input) });
    } else {
      toInsert.push({
        nations_id: nationsId,
        lagenhetsnummer: input.lagenhetsnummer,
        ...editInputToRow(input),
        klar_for_betalning_datum: null,
        klar_for_betalning_av: null,
        betalning_gjord_datum: null,
        betalning_gjord_av: null,
        status: "aktiv",
      });
    }
  }

  // Batched per chunk for speed; on a chunk failure, fall back to writing
  // that chunk's rows one at a time (same behavior as before this change —
  // throws on the first bad row), limiting a bad row's blast radius to its
  // own chunk instead of the whole import.
  for (const rows of chunkArray(toInsert)) {
    const { error } = await supabase.from("besiktningar").insert(rows);
    if (!error) continue;
    for (const row of rows) {
      const { error: rowError } = await supabase.from("besiktningar").insert(row);
      if (rowError) throw rowError;
    }
  }
  for (const rows of chunkArray(toUpdate)) {
    const { error } = await supabase.from("besiktningar").upsert(rows, { onConflict: "id" });
    if (!error) continue;
    for (const row of rows) {
      const { id, ...rest } = row;
      const { error: rowError } = await supabase.from("besiktningar").update(rest).eq("id", id as string);
      if (rowError) throw rowError;
    }
  }
  return { inserted: toInsert.length, updated: toUpdate.length };
}

export async function deleteBesiktning(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("besiktningar")
    .delete()
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function archiveBesiktning(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data, error: findError } = await supabase
    .from("besiktningar")
    .select("betalning_gjord_datum")
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  if (!data) throw new Error("Besiktningen hittades inte.");
  if (!data.betalning_gjord_datum) {
    throw new Error("Besiktningen kan inte arkiveras förrän betalning är gjord.");
  }
  const { error } = await supabase
    .from("besiktningar")
    .update({ status: "arkiverad" })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}
