import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { FloorLayoutBlock } from "@/lib/building-floor-logic";

export type BuildingFloorTemplate = { id: string; name: string; blocks: FloorLayoutBlock[] };
type Row = { id: string; name: string; blocks: FloorLayoutBlock[] };

export async function getBuildingFloorTemplates(nationsId: string): Promise<BuildingFloorTemplate[]> {
  const { data, error } = await createSupabaseServerClient().from("building_floor_templates").select("id, name, blocks").eq("nations_id", nationsId).order("name");
  if (error) throw error;
  return (data as Row[]).map((row) => ({ id: row.id, name: row.name, blocks: row.blocks }));
}

export async function saveBuildingFloorTemplate(nationsId: string, name: string, blocks: FloorLayoutBlock[]): Promise<void> {
  const { error } = await createSupabaseServerClient().from("building_floor_templates").upsert({ nations_id: nationsId, name, blocks, updated_at: new Date().toISOString() }, { onConflict: "nations_id,name" });
  if (error) throw error;
}

export async function deleteBuildingFloorTemplate(nationsId: string, id: string): Promise<void> {
  const { error } = await createSupabaseServerClient().from("building_floor_templates").delete().eq("nations_id", nationsId).eq("id", id);
  if (error) throw error;
}
