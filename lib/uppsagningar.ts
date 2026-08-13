import "server-only";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type Uppsagning = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  hyresgastNamn: string;
  bekraftelsedatum: string;
  bekraftadAv: string;
  flyttdatum: string;
  dokumentFilnamn: string;
};

export type UppsagningInput = Omit<Uppsagning, "id" | "dokumentFilnamn"> & {
  dokument: { data: Buffer; contentType: string; filename: string };
};

const BUCKET = "uppsagningar-dokument";

const UPPSAGNING_COLUMNS =
  "id, lagenhetsnummer, fastighet, hyresgast_namn, bekraftelsedatum, bekraftad_av, flyttdatum, dokument_filnamn" as const;

type UppsagningRow = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  hyresgast_namn: string;
  bekraftelsedatum: string;
  bekraftad_av: string | null;
  flyttdatum: string;
  dokument_filnamn: string;
};

function mapRow(row: UppsagningRow): Uppsagning {
  return {
    id: row.id,
    lagenhetsnummer: row.lagenhetsnummer,
    fastighet: row.fastighet,
    hyresgastNamn: row.hyresgast_namn,
    bekraftelsedatum: row.bekraftelsedatum,
    bekraftadAv: row.bekraftad_av ?? "",
    flyttdatum: row.flyttdatum,
    dokumentFilnamn: row.dokument_filnamn,
  };
}

export async function getUppsagningar(nationsId: string): Promise<Uppsagning[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("uppsagningar")
    .select(UPPSAGNING_COLUMNS)
    .eq("nations_id", nationsId)
    .order("bekraftelsedatum", { ascending: false });
  if (error) throw error;
  return (data as UppsagningRow[]).map(mapRow);
}

// Uploads to Storage first, using a pre-generated id for both the row and
// the storage path — same shape as createFloorPlan (lib/floor-plans.ts).
export async function createUppsagning(nationsId: string, input: UppsagningInput): Promise<Uppsagning> {
  const supabase = createSupabaseServerClient();
  const { dokument, ...rest } = input;
  const id = randomUUID();
  const storagePath = `${nationsId}/${id}/${dokument.filename}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, dokument.data, { contentType: dokument.contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("uppsagningar")
    .insert({
      id,
      nations_id: nationsId,
      lagenhetsnummer: rest.lagenhetsnummer,
      fastighet: rest.fastighet,
      hyresgast_namn: rest.hyresgastNamn,
      bekraftelsedatum: rest.bekraftelsedatum,
      bekraftad_av: rest.bekraftadAv,
      flyttdatum: rest.flyttdatum,
      dokument_storage_path: storagePath,
      dokument_filnamn: dokument.filename,
      dokument_content_type: dokument.contentType,
    })
    .select(UPPSAGNING_COLUMNS)
    .single();
  if (error) throw error;
  return mapRow(data as UppsagningRow);
}

export async function getUppsagningFile(
  nationsId: string,
  id: string
): Promise<{ data: Buffer; contentType: string; filename: string } | null> {
  const supabase = createSupabaseServerClient();
  const { data: row, error: findError } = await supabase
    .from("uppsagningar")
    .select("dokument_storage_path, dokument_filnamn, dokument_content_type")
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  if (!row) return null;

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(row.dokument_storage_path);
  if (downloadError) throw downloadError;
  return {
    data: Buffer.from(await blob.arrayBuffer()),
    contentType: row.dokument_content_type,
    filename: row.dokument_filnamn,
  };
}

export async function deleteUppsagning(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("uppsagningar")
    .select("dokument_storage_path")
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  if (!existing) return;

  const { error } = await supabase
    .from("uppsagningar")
    .delete()
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;

  await supabase.storage.from(BUCKET).remove([existing.dokument_storage_path]);
}
