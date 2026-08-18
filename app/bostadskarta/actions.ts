"use server";

import { revalidatePath } from "next/cache";
import { generateRoomNumbers, normalizeRoomPositions, placeRooms, validateLayoutBlocks, type FloorSeries, type PlacementMode, type RoomPlacement } from "@/lib/building-floor-logic";
import { createBuildingFloor, deleteBuildingFloor, getBuildingFloor, getBuildingFloors, reorderBuildingFloors, saveBuildingFloorBlocks, saveBuildingFloorRooms, updateBuildingFloor } from "@/lib/building-floors";
import { getFastigheter } from "@/lib/fastigheter";
import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/roles";

const modes = new Set<PlacementMode>(["alternating_left", "alternating_right", "left_first", "right_first"]);

async function authorize() {
  return requirePermission(PERMISSIONS.FASTIGHETER_MANAGE, "Du saknar behörighet att hantera bostadskartan.");
}

function cleanSeries(value: unknown): FloorSeries[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Lägg till minst en nummerserie.");
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Ogiltig nummerserie.");
    const row = item as Record<string, unknown>;
    const prefix = typeof row.prefix === "string" ? row.prefix.trim().toUpperCase() : "";
    const start = Number(row.start), end = Number(row.end), padTo = Number(row.padTo);
    if (!/^[A-ZÅÄÖ0-9-]{0,12}$/.test(prefix) || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || !Number.isSafeInteger(padTo) || start < 0 || end < start || padTo < 0 || padTo > 12) {
      throw new Error("Kontrollera prefix, intervall och nollutfyllnad.");
    }
    return { prefix, start, end, padTo };
  });
}

function cleanMode(value: unknown): PlacementMode {
  if (!modes.has(value as PlacementMode)) throw new Error("Ogiltigt placeringsläge.");
  return value as PlacementMode;
}

function cleanRooms(value: unknown): RoomPlacement[] {
  if (!Array.isArray(value)) throw new Error("Ogiltig rumslayout.");
  const rooms = value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Ogiltig rumslayout.");
    const row = item as Record<string, unknown>;
    if (typeof row.lagenhetsnummer !== "string" || !row.lagenhetsnummer.trim() || (row.side !== "left" && row.side !== "right")) throw new Error("Ogiltig rumslayout.");
    return { lagenhetsnummer: row.lagenhetsnummer.trim(), side: row.side as RoomPlacement["side"], position: 0 };
  });
  if (rooms.length > 500 || new Set(rooms.map((room) => room.lagenhetsnummer)).size !== rooms.length) throw new Error("Rumslayouten innehåller för många rum eller dubbletter.");
  return normalizeRoomPositions(rooms);
}

async function requireBuilding(nationsId: string, id: string) {
  const building = (await getFastigheter(nationsId)).find((item) => item.id === id);
  if (!building) throw new Error("Fastigheten hittades inte.");
  return building;
}

async function assertUnique(nationsId: string, fastighetId: string, numbers: string[], exceptId?: string) {
  const used = new Set((await getBuildingFloors(nationsId)).filter((floor) => floor.fastighetId === fastighetId && floor.id !== exceptId).flatMap((floor) => floor.rooms.map((room) => room.lagenhetsnummer)));
  if (numbers.some((number) => used.has(number))) throw new Error("Ett eller flera lägenhetsnummer finns redan på en annan våning.");
}

export async function createFloorAction(fastighetId: string, namn: string, seriesValue: unknown, modeValue: unknown) {
  const { nationsId } = await authorize();
  await requireBuilding(nationsId, fastighetId);
  const cleanName = namn.trim();
  if (!cleanName || cleanName.length > 80) throw new Error("Ange ett våningsnamn med högst 80 tecken.");
  const series = cleanSeries(seriesValue), placementMode = cleanMode(modeValue);
  const numbers = generateRoomNumbers(series);
  await assertUnique(nationsId, fastighetId, numbers);
  const floors = (await getBuildingFloors(nationsId)).filter((floor) => floor.fastighetId === fastighetId);
  await createBuildingFloor(nationsId, { fastighetId, namn: cleanName, sortOrder: floors.length, placementMode, series, rooms: placeRooms(numbers, placementMode), layoutBlocks: [] });
  revalidatePath("/bostadskarta");
}

export async function updateFloorAction(id: string, namn: string, seriesValue: unknown, modeValue: unknown) {
  const { nationsId } = await authorize();
  const floor = await getBuildingFloor(nationsId, id);
  if (!floor) throw new Error("Våningen hittades inte.");
  await requireBuilding(nationsId, floor.fastighetId);
  const cleanName = namn.trim();
  if (!cleanName || cleanName.length > 80) throw new Error("Ange ett våningsnamn med högst 80 tecken.");
  const series = cleanSeries(seriesValue), placementMode = cleanMode(modeValue);
  const numbers = generateRoomNumbers(series);
  await assertUnique(nationsId, floor.fastighetId, numbers, id);
  await updateBuildingFloor(nationsId, id, { namn: cleanName, series, placementMode, rooms: placeRooms(numbers, placementMode) });
  revalidatePath("/bostadskarta");
}

export async function saveFloorLayoutAction(id: string, roomsValue: unknown) {
  const { nationsId } = await authorize();
  const floor = await getBuildingFloor(nationsId, id);
  if (!floor) throw new Error("Våningen hittades inte.");
  const rooms = cleanRooms(roomsValue);
  if (rooms.length !== floor.rooms.length || new Set(rooms.map((room) => room.lagenhetsnummer)).size !== floor.rooms.length || rooms.some((room) => !floor.rooms.some((existing) => existing.lagenhetsnummer === room.lagenhetsnummer))) throw new Error("Layouten måste innehålla exakt våningens befintliga rum.");
  await saveBuildingFloorRooms(nationsId, id, rooms);
  revalidatePath("/bostadskarta");
}

export async function saveFloorBlocksAction(id: string, blocksValue: unknown) {
  const { nationsId } = await authorize();
  const floor = await getBuildingFloor(nationsId, id);
  if (!floor) throw new Error("Våningen hittades inte.");
  const blocks = validateLayoutBlocks(blocksValue);
  const roomNumbers = new Set(floor.rooms.map((room) => room.lagenhetsnummer));
  if (blocks.some((block) => block.type === "apartment" && !roomNumbers.has(block.lagenhetsnummer ?? ""))) throw new Error("Ett lägenhetsblock har ett nummer som inte finns på våningen.");
  const apartmentNumbers = blocks.filter((block) => block.type === "apartment").map((block) => block.lagenhetsnummer);
  if (new Set(apartmentNumbers).size !== apartmentNumbers.length) throw new Error("Varje lägenhetsnummer får bara användas i ett block.");
  await saveBuildingFloorBlocks(nationsId, id, blocks);
  revalidatePath("/bostadskarta");
}

export async function reorderFloorsAction(fastighetId: string, ids: string[]) {
  const { nationsId } = await authorize();
  await requireBuilding(nationsId, fastighetId);
  const existing = (await getBuildingFloors(nationsId)).filter((floor) => floor.fastighetId === fastighetId).map((floor) => floor.id);
  if (ids.length !== existing.length || new Set(ids).size !== ids.length || ids.some((id) => !existing.includes(id))) throw new Error("Ogiltig våningsordning.");
  await reorderBuildingFloors(nationsId, fastighetId, ids);
  revalidatePath("/bostadskarta");
}

export async function deleteFloorAction(id: string) {
  const { nationsId } = await authorize();
  if (!(await getBuildingFloor(nationsId, id))) throw new Error("Våningen hittades inte.");
  await deleteBuildingFloor(nationsId, id);
  revalidatePath("/bostadskarta");
}
