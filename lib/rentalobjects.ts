import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { ApartmentSpecs } from "@/lib/apartments";

// Prefixes used in the databas lagenhetsnummer per fastighet.
// Needed when the tenant's lagenhetsnummer (e.g. "1402") doesn't include
// the prefix that was added on import (e.g. "GH1402").
const FASTIGHET_PREFIXES: Record<string, string[]> = {
  "Gamla huset (223 51, Lund)": ["GH"],
  "Nya huset (223 51, Lund)": ["NH"],
  "Finn huset (223 51, Lund)": ["FH"],
  "Arkivet (223 59, Lund)": ["B", "C", "D"],
};

export type RentalObject = {
  id: string;
  fastighet: string;
  lagenhetsnummer: string;
  area: number | null;
  areaInkKorr: number | null;
  typ: string;
  malbildshyra: number | null;
  renoveringsbehov: number | null;
  hyresrabatt: number | null;
  hyresred: number | null;
  individuellArshyra: number | null;
  manadshyra: number | null;
  planritning: string | null;
  // Nation-defined free-text fields (e.g. "notes") configured via the admin
  // page — never read by any calculation, purely stored and displayed.
  custom: Record<string, string>;
};

export type RentalObjectInput = Omit<RentalObject, "id" | "custom"> & {
  custom?: Record<string, string>;
};

type RentalObjectRow = {
  id: string;
  fastighet: string;
  lagenhetsnummer: string;
  area: number | null;
  area_ink_korr: number | null;
  typ: string | null;
  malbildshyra: number | null;
  renoveringsbehov: number | null;
  hyresrabatt: number | null;
  hyresred: number | null;
  individuell_arshyra: number | null;
  manadshyra: number | null;
  planritning: string | null;
  custom: Record<string, string> | null;
};

const RENTALOBJECT_COLUMNS =
  "id, fastighet, lagenhetsnummer, area, area_ink_korr, typ, malbildshyra, renoveringsbehov, hyresrabatt, hyresred, individuell_arshyra, manadshyra, planritning, custom" as const;

function mapRow(row: RentalObjectRow): RentalObject {
  return {
    id: row.id,
    fastighet: row.fastighet,
    lagenhetsnummer: row.lagenhetsnummer,
    area: row.area ?? null,
    areaInkKorr: row.area_ink_korr ?? null,
    typ: row.typ ?? "",
    malbildshyra: row.malbildshyra ?? null,
    renoveringsbehov: row.renoveringsbehov ?? null,
    hyresrabatt: row.hyresrabatt ?? null,
    hyresred: row.hyresred ?? null,
    individuellArshyra: row.individuell_arshyra ?? null,
    manadshyra: row.manadshyra ?? null,
    planritning: row.planritning ?? null,
    custom: row.custom ?? {},
  };
}

function toRow(input: RentalObjectInput) {
  return {
    fastighet: input.fastighet,
    lagenhetsnummer: input.lagenhetsnummer,
    area: input.area,
    area_ink_korr: input.areaInkKorr,
    typ: input.typ,
    malbildshyra: input.malbildshyra,
    renoveringsbehov: input.renoveringsbehov,
    hyresrabatt: input.hyresrabatt,
    hyresred: input.hyresred,
    individuell_arshyra: input.individuellArshyra,
    manadshyra: input.manadshyra,
    planritning: input.planritning,
    custom: input.custom ?? {},
  };
}

export async function getRentalObjects(nationsId: string): Promise<RentalObject[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rentalobjects")
    .select(RENTALOBJECT_COLUMNS)
    .eq("nations_id", nationsId)
    .order("fastighet", { ascending: true })
    .order("lagenhetsnummer", { ascending: true });
  if (error) throw error;
  return (data as RentalObjectRow[]).map(mapRow);
}

export async function getRentalObjectsByIds(nationsId: string, ids: string[]): Promise<RentalObject[]> {
  if (ids.length === 0) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rentalobjects")
    .select(RENTALOBJECT_COLUMNS)
    .eq("nations_id", nationsId)
    .in("id", ids);
  if (error) throw error;
  return (data as RentalObjectRow[]).map(mapRow);
}

export async function createRentalObject(nationsId: string, input: RentalObjectInput): Promise<string> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("rentalobjects")
    .insert({ nations_id: nationsId, ...toRow(input) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateRentalObject(
  nationsId: string,
  id: string,
  input: RentalObjectInput
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("rentalobjects")
    .update(toRow(input))
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function deleteRentalObject(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("rentalobjects")
    .delete()
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

// Pushes pricing edited on an apartment (Lediga lägenheter) back onto its
// matching databas entry, the reverse direction of
// syncApartmentPricingFromRentalObject. Only touches the pricing fields —
// area/typ/renoveringsbehov/planritning aren't known from the apartment side.
export async function updateRentalObjectPricing(
  nationsId: string,
  id: string,
  updates: Pick<RentalObjectInput, "malbildshyra" | "hyresrabatt" | "hyresred" | "individuellArshyra" | "manadshyra">
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("rentalobjects")
    .update({
      malbildshyra: updates.malbildshyra,
      hyresrabatt: updates.hyresrabatt,
      hyresred: updates.hyresred,
      individuell_arshyra: updates.individuellArshyra,
      manadshyra: updates.manadshyra,
    })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

// Tries to find a rental object matching a tenant's apartment.
// First tries an exact lagenhetsnummer match, then tries each prefix
// that corresponds to the fastighet (for cases where the tenant record
// stores "1402" but the databas has "GH1402"). .maybeSingle() is safe here
// — (nations_id, lagenhetsnummer) is a unique constraint in Postgres.
export async function findRentalObjectForApartment(
  nationsId: string,
  lagenhetsnummer: string,
  fastighet: string
): Promise<RentalObject | null> {
  const supabase = createSupabaseServerClient();

  const { data: exact, error: exactError } = await supabase
    .from("rentalobjects")
    .select(RENTALOBJECT_COLUMNS)
    .eq("nations_id", nationsId)
    .eq("lagenhetsnummer", lagenhetsnummer)
    .maybeSingle();
  if (exactError) throw exactError;
  if (exact) return mapRow(exact as RentalObjectRow);

  for (const prefix of FASTIGHET_PREFIXES[fastighet] ?? []) {
    const { data: prefixed, error } = await supabase
      .from("rentalobjects")
      .select(RENTALOBJECT_COLUMNS)
      .eq("nations_id", nationsId)
      .eq("lagenhetsnummer", prefix + lagenhetsnummer)
      .maybeSingle();
    if (error) throw error;
    if (prefixed) return mapRow(prefixed as RentalObjectRow);
  }

  return null;
}

const ALL_PREFIXES = Array.from(new Set(Object.values(FASTIGHET_PREFIXES).flat()));

// Same matching as findRentalObjectForApartment, but for when the fastighet
// isn't known yet (e.g. typing a lägenhetsnummer before picking a fastighet)
// — tries an exact match, then every fastighet's prefix in turn.
export async function findRentalObjectByLagenhetsnummer(
  nationsId: string,
  lagenhetsnummer: string
): Promise<RentalObject | null> {
  const supabase = createSupabaseServerClient();

  const { data: exact, error: exactError } = await supabase
    .from("rentalobjects")
    .select(RENTALOBJECT_COLUMNS)
    .eq("nations_id", nationsId)
    .eq("lagenhetsnummer", lagenhetsnummer)
    .maybeSingle();
  if (exactError) throw exactError;
  if (exact) return mapRow(exact as RentalObjectRow);

  for (const prefix of ALL_PREFIXES) {
    const { data: prefixed, error } = await supabase
      .from("rentalobjects")
      .select(RENTALOBJECT_COLUMNS)
      .eq("nations_id", nationsId)
      .eq("lagenhetsnummer", prefix + lagenhetsnummer)
      .maybeSingle();
    if (error) throw error;
    if (prefixed) return mapRow(prefixed as RentalObjectRow);
  }

  return null;
}

export function rentalObjectToApartmentSpecs(ro: RentalObject): ApartmentSpecs {
  const area = ro.areaInkKorr ?? ro.area;
  return {
    fastighet: ro.fastighet,
    storlek: area != null ? `${area} m²` : "",
    objekttyp: ro.typ ?? "",
    antalRum: 0,
    arshyra: ro.malbildshyra ?? 0,
    hyresrabatt: ro.hyresrabatt ?? 0,
    hyresreduktion: ro.hyresred ?? 0,
    arshyraMedRed: ro.individuellArshyra ?? 0,
    manadshyra: ro.manadshyra ?? 0,
  };
}

export type BulkUpsertRentalResult = { inserted: number; updated: number };

// Two round trips total regardless of row count — see the identical
// pattern/rationale in bulkUpsertTenants (lib/tenants.ts).
export async function bulkUpsertRentalObjects(
  nationsId: string,
  inputs: RentalObjectInput[]
): Promise<BulkUpsertRentalResult> {
  if (inputs.length === 0) return { inserted: 0, updated: 0 };
  const supabase = createSupabaseServerClient();

  const { data: existing, error: findError } = await supabase
    .from("rentalobjects")
    .select("lagenhetsnummer")
    .eq("nations_id", nationsId);
  if (findError) throw findError;
  const existingKeys = new Set((existing as { lagenhetsnummer: string }[]).map((r) => r.lagenhetsnummer));

  const { error } = await supabase
    .from("rentalobjects")
    .upsert(
      inputs.map((input) => ({ nations_id: nationsId, ...toRow(input) })),
      { onConflict: "nations_id,lagenhetsnummer" }
    );
  if (error) throw error;

  let inserted = 0;
  let updated = 0;
  for (const input of inputs) {
    if (existingKeys.has(input.lagenhetsnummer)) updated++;
    else inserted++;
  }
  return { inserted, updated };
}
