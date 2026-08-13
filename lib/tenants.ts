import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type Tenant = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  personnummer: string;
  mejladress: string;
  telefonnummer: string;
};

export type TenantInput = {
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  personnummer: string;
  mejladress: string;
  telefonnummer: string;
};

type TenantRow = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  personnummer: string | null;
  mejladress: string;
  telefonnummer: string;
};

function mapRow(row: TenantRow): Tenant {
  return {
    id: row.id,
    lagenhetsnummer: row.lagenhetsnummer,
    fastighet: row.fastighet,
    namn: row.namn,
    personnummer: row.personnummer ?? "",
    mejladress: row.mejladress,
    telefonnummer: row.telefonnummer,
  };
}

function toRow(input: TenantInput) {
  return {
    lagenhetsnummer: input.lagenhetsnummer,
    fastighet: input.fastighet,
    namn: input.namn,
    personnummer: input.personnummer,
    mejladress: input.mejladress,
    telefonnummer: input.telefonnummer,
  };
}

export async function getTenants(nationsId: string): Promise<Tenant[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, lagenhetsnummer, fastighet, namn, personnummer, mejladress, telefonnummer")
    .eq("nations_id", nationsId)
    .order("fastighet", { ascending: true })
    .order("lagenhetsnummer", { ascending: true });
  if (error) throw error;
  return (data as TenantRow[]).map(mapRow);
}

export async function createTenant(nationsId: string, input: TenantInput): Promise<string> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tenants")
    .insert({ nations_id: nationsId, ...toRow(input) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateTenant(
  nationsId: string,
  id: string,
  input: TenantInput
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("tenants")
    .update(toRow(input))
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function deleteTenant(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("tenants")
    .delete()
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

// Replaces whoever is currently listed for this apartment number, or
// inserts a new row if nobody is. Used when pushing a signed contract's
// tenant over from the archive.
export async function upsertTenantByLagenhetsnummer(
  nationsId: string,
  input: TenantInput
): Promise<{ replaced: boolean }> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("tenants")
    .select("id")
    .eq("nations_id", nationsId)
    .eq("lagenhetsnummer", input.lagenhetsnummer)
    .maybeSingle();
  if (findError) throw findError;

  const { error } = await supabase
    .from("tenants")
    .upsert(
      { nations_id: nationsId, ...toRow(input) },
      { onConflict: "nations_id,lagenhetsnummer" }
    );
  if (error) throw error;
  return { replaced: !!existing };
}

export type BulkUpsertResult = { inserted: number; updated: number };

// Two round trips total regardless of row count (fetch existing keys once,
// upsert the whole batch once) rather than one per row — this collection
// routinely sees imports in the hundreds of rows.
export async function bulkUpsertTenants(
  nationsId: string,
  inputs: TenantInput[]
): Promise<BulkUpsertResult> {
  if (inputs.length === 0) return { inserted: 0, updated: 0 };
  const supabase = createSupabaseServerClient();

  const { data: existing, error: findError } = await supabase
    .from("tenants")
    .select("lagenhetsnummer")
    .eq("nations_id", nationsId);
  if (findError) throw findError;
  const existingKeys = new Set((existing as { lagenhetsnummer: string }[]).map((r) => r.lagenhetsnummer));

  const { error } = await supabase
    .from("tenants")
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
