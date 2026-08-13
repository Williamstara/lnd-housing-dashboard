import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type Fastighet = {
  id: string;
  namn: string;
  // Lägenhetsnummer prefixes that identify this building (e.g. Arkivet's
  // apartments start "B"/"C"/"D") — lets an import derive fastighet from
  // lägenhetsnummer alone when the sheet has no Fastighet column.
  prefixes: string[];
};

type FastighetRow = {
  id: string;
  namn: string;
  prefixes: string[] | null;
};

function mapRow(row: FastighetRow): Fastighet {
  return { id: row.id, namn: row.namn, prefixes: row.prefixes ?? [] };
}

export async function getFastigheter(nationsId: string): Promise<Fastighet[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fastigheter")
    .select("id, namn, prefixes")
    .eq("nations_id", nationsId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as FastighetRow[]).map(mapRow);
}

export async function getFastighetNamn(nationsId: string): Promise<string[]> {
  const fastigheter = await getFastigheter(nationsId);
  return fastigheter.map((f) => f.namn);
}

export async function createFastighet(
  nationsId: string,
  namn: string,
  prefixes: string[] = []
): Promise<Fastighet> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fastigheter")
    .insert({ nations_id: nationsId, namn, prefixes })
    .select("id, namn, prefixes")
    .single();
  if (error) throw error;
  return mapRow(data as FastighetRow);
}

export async function updateFastighet(
  nationsId: string,
  id: string,
  namn: string,
  prefixes: string[]
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("fastigheter")
    .update({ namn, prefixes })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function deleteFastighet(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("fastigheter")
    .delete()
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}
