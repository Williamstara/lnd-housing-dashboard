import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { FloorLayoutBlock, FloorSeries, PlacementMode, RoomPlacement } from "@/lib/building-floor-logic";

export type BuildingFloor = {
  id: string;
  fastighetId: string;
  namn: string;
  sortOrder: number;
  placementMode: PlacementMode;
  series: FloorSeries[];
  rooms: RoomPlacement[];
  layoutBlocks: FloorLayoutBlock[];
};

type Row = { id: string; fastighet_id: string; namn: string; sort_order: number; placement_mode: PlacementMode; series: FloorSeries[]; rooms: RoomPlacement[]; layout_blocks: FloorLayoutBlock[] };
const columns = "id, fastighet_id, namn, sort_order, placement_mode, series, rooms, layout_blocks";
const mapRow = (row: Row): BuildingFloor => ({ id: row.id, fastighetId: row.fastighet_id, namn: row.namn, sortOrder: row.sort_order, placementMode: row.placement_mode, series: row.series, rooms: row.rooms, layoutBlocks: row.layout_blocks ?? [] });

export async function getBuildingFloors(nationsId: string): Promise<BuildingFloor[]> {
  const { data, error } = await createSupabaseServerClient().from("building_floors").select(columns).eq("nations_id", nationsId).order("sort_order");
  if (error) throw error;
  return (data as Row[]).map(mapRow);
}

export async function getBuildingFloor(nationsId: string, id: string): Promise<BuildingFloor | null> {
  const { data, error } = await createSupabaseServerClient().from("building_floors").select(columns).eq("nations_id", nationsId).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Row) : null;
}

export async function createBuildingFloor(nationsId: string, input: Omit<BuildingFloor, "id">): Promise<void> {
  const { error } = await createSupabaseServerClient().from("building_floors").insert({ nations_id: nationsId, fastighet_id: input.fastighetId, namn: input.namn, sort_order: input.sortOrder, placement_mode: input.placementMode, series: input.series, rooms: input.rooms, layout_blocks: input.layoutBlocks });
  if (error) throw error;
}

export async function updateBuildingFloor(nationsId: string, id: string, input: Pick<BuildingFloor, "namn" | "placementMode" | "series" | "rooms">): Promise<void> {
  const { error } = await createSupabaseServerClient().from("building_floors").update({ namn: input.namn, placement_mode: input.placementMode, series: input.series, rooms: input.rooms, layout_blocks: [], updated_at: new Date().toISOString() }).eq("nations_id", nationsId).eq("id", id);
  if (error) throw error;
}

export async function saveBuildingFloorRooms(nationsId: string, id: string, rooms: RoomPlacement[]): Promise<void> {
  const { error } = await createSupabaseServerClient().from("building_floors").update({ rooms, updated_at: new Date().toISOString() }).eq("nations_id", nationsId).eq("id", id);
  if (error) throw error;
}

export async function saveBuildingFloorBlocks(nationsId: string, id: string, blocks: FloorLayoutBlock[]): Promise<void> {
  const { error } = await createSupabaseServerClient().from("building_floors").update({ layout_blocks: blocks, updated_at: new Date().toISOString() }).eq("nations_id", nationsId).eq("id", id);
  if (error) throw error;
}

export async function reorderBuildingFloors(nationsId: string, fastighetId: string, ids: string[]): Promise<void> {
  const supabase = createSupabaseServerClient();
  for (const [sortOrder, id] of ids.entries()) {
    const { error } = await supabase.from("building_floors").update({ sort_order: sortOrder, updated_at: new Date().toISOString() }).eq("nations_id", nationsId).eq("fastighet_id", fastighetId).eq("id", id);
    if (error) throw error;
  }
}

export async function deleteBuildingFloor(nationsId: string, id: string): Promise<void> {
  const { error } = await createSupabaseServerClient().from("building_floors").delete().eq("nations_id", nationsId).eq("id", id);
  if (error) throw error;
}
