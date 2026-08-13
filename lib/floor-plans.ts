import "server-only";
import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type FloorPlan = {
  id: string;
  aptName: string;
  contentType: string;
  createdAt: Date;
  updatedAt: Date;
};

const BUCKET = "floor-plans";

type FloorPlanRow = {
  id: string;
  apt_name: string;
  storage_path: string;
  content_type: string;
  created_at: string;
  updated_at: string;
};

function mapRow(row: FloorPlanRow): FloorPlan {
  return {
    id: row.id,
    aptName: row.apt_name,
    contentType: row.content_type,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getFloorPlans(nationsId: string): Promise<FloorPlan[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("floor_plans")
    .select("id, apt_name, storage_path, content_type, created_at, updated_at")
    .eq("nations_id", nationsId)
    .order("apt_name", { ascending: true });
  if (error) throw error;
  return (data as FloorPlanRow[]).map(mapRow);
}

// Uploads to Storage first, using a pre-generated id for both the row and
// the storage path — avoids a third round trip to learn the DB-assigned id
// before it can be used in the path.
export async function createFloorPlan(
  nationsId: string,
  aptName: string,
  data: Buffer,
  contentType: string
): Promise<FloorPlan> {
  const supabase = createSupabaseServerClient();
  const id = randomUUID();
  const storagePath = `${nationsId}/${id}/${aptName}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, data, { contentType, upsert: false });
  if (uploadError) throw uploadError;

  const { data: row, error } = await supabase
    .from("floor_plans")
    .insert({ id, nations_id: nationsId, apt_name: aptName, storage_path: storagePath, content_type: contentType })
    .select("id, apt_name, storage_path, content_type, created_at, updated_at")
    .single();
  if (error) throw error;
  return mapRow(row as FloorPlanRow);
}

export async function updateFloorPlan(nationsId: string, id: string, aptName: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("floor_plans")
    .update({ apt_name: aptName, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("nations_id", nationsId)
    .select("id");
  if (error) throw error;
  return (data as { id: string }[]).length > 0;
}

// Deletes the DB row first, then best-effort removes the Storage object —
// if row deletion fails nothing changes; if it succeeds but the Storage
// removal fails, the result is an orphaned file (harmless wasted space),
// never a DB row pointing at a file that no longer exists.
export async function deleteFloorPlan(nationsId: string, id: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("floor_plans")
    .select("storage_path")
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  if (!existing) return false;

  const { error } = await supabase
    .from("floor_plans")
    .delete()
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;

  await supabase.storage.from(BUCKET).remove([existing.storage_path]);
  return true;
}

export async function getFloorPlanFile(
  nationsId: string,
  id: string
): Promise<{ data: Buffer; contentType: string; aptName: string } | null> {
  const supabase = createSupabaseServerClient();
  const { data: row, error: findError } = await supabase
    .from("floor_plans")
    .select("storage_path, content_type, apt_name")
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  if (!row) return null;

  const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(row.storage_path);
  if (downloadError) throw downloadError;
  return {
    data: Buffer.from(await blob.arrayBuffer()),
    contentType: row.content_type,
    aptName: row.apt_name,
  };
}

export async function getFloorPlanByAptName(
  nationsId: string,
  aptName: string
): Promise<{ data: Buffer; contentType: string } | null> {
  const supabase = createSupabaseServerClient();
  const { data: row, error: findError } = await supabase
    .from("floor_plans")
    .select("storage_path, content_type")
    .eq("nations_id", nationsId)
    .ilike("apt_name", aptName)
    .maybeSingle();
  if (findError) throw findError;
  if (!row) return null;

  const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(row.storage_path);
  if (downloadError) throw downloadError;
  return { data: Buffer.from(await blob.arrayBuffer()), contentType: row.content_type };
}
