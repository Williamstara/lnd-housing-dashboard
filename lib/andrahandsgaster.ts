import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type Andrahandsgast = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  personnummer: string;
  mejladress: string;
  telefonnummer: string;
  typ: Boendeform;
};

export type Boendeform = "andrahandsgast" | "inneboende";

export type AndrahandsgastInput = {
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  personnummer: string;
  mejladress: string;
  telefonnummer: string;
  typ: Boendeform;
};

type AndrahandsgastRow = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  personnummer: string | null;
  mejladress: string;
  telefonnummer: string;
  typ: Boendeform | null;
};

function mapRow(row: AndrahandsgastRow): Andrahandsgast {
  return {
    id: row.id,
    lagenhetsnummer: row.lagenhetsnummer,
    fastighet: row.fastighet,
    namn: row.namn,
    personnummer: row.personnummer ?? "",
    mejladress: row.mejladress,
    telefonnummer: row.telefonnummer,
    typ: row.typ ?? "andrahandsgast",
  };
}

function toRow(input: AndrahandsgastInput) {
  return {
    lagenhetsnummer: input.lagenhetsnummer,
    fastighet: input.fastighet,
    namn: input.namn,
    personnummer: input.personnummer,
    mejladress: input.mejladress,
    telefonnummer: input.telefonnummer,
    typ: input.typ,
  };
}

export async function getAndrahandsgaster(nationsId: string): Promise<Andrahandsgast[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("andrahandsgaster")
    .select("id, lagenhetsnummer, fastighet, namn, personnummer, mejladress, telefonnummer, typ")
    .eq("nations_id", nationsId)
    .order("lagenhetsnummer", { ascending: true });
  if (error) throw error;
  return (data as AndrahandsgastRow[]).map(mapRow);
}

export async function createAndrahandsgast(nationsId: string, input: AndrahandsgastInput): Promise<string> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("andrahandsgaster")
    .insert({ nations_id: nationsId, ...toRow(input) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateAndrahandsgast(
  nationsId: string,
  id: string,
  input: AndrahandsgastInput
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("andrahandsgaster")
    .update(toRow(input))
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function deleteAndrahandsgast(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("andrahandsgaster")
    .delete()
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export type BulkUpsertAndrahandsgastResult = { inserted: number; updated: number };

// Two round trips total regardless of row count — see the identical
// pattern/rationale in bulkUpsertTenants (lib/tenants.ts).
export async function bulkUpsertAndrahandsgaster(
  nationsId: string,
  inputs: AndrahandsgastInput[]
): Promise<BulkUpsertAndrahandsgastResult> {
  if (inputs.length === 0) return { inserted: 0, updated: 0 };
  const supabase = createSupabaseServerClient();

  const { data: existing, error: findError } = await supabase
    .from("andrahandsgaster")
    .select("lagenhetsnummer")
    .eq("nations_id", nationsId);
  if (findError) throw findError;
  const existingKeys = new Set((existing as { lagenhetsnummer: string }[]).map((r) => r.lagenhetsnummer));

  const { error } = await supabase
    .from("andrahandsgaster")
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
