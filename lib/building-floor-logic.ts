export const MAX_FLOOR_ROOMS = 500;

export type PlacementMode = "alternating_left" | "alternating_right" | "left_first" | "right_first";
export type FloorSeries = { prefix: string; start: number; end: number; padTo: number };
export type RoomPlacement = { lagenhetsnummer: string; side: "left" | "right"; position: number };
export type FloorBlockType = "apartment" | "common" | "corridor" | "blocked" | "empty";
export type FloorLayoutBlock = {
  id: string;
  type: FloorBlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  lagenhetsnummer?: string;
};

export function clampBlockPosition(x: number, y: number, width: number, height: number) {
  return {
    x: Math.max(0, Math.min(12 - width, x)),
    y: Math.max(0, Math.min(100 - height, y)),
  };
}

export function blocksOverlap(a: FloorLayoutBlock, b: FloorLayoutBlock) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function hasBlockCollision(candidate: FloorLayoutBlock, blocks: FloorLayoutBlock[]) {
  return blocks.some((block) => block.id !== candidate.id && blocksOverlap(candidate, block));
}

export function findFreeBlockPosition(block: FloorLayoutBlock, blocks: FloorLayoutBlock[]) {
  const candidates = [
    { x: block.x + block.width, y: block.y },
    { x: block.x, y: block.y + block.height },
  ];
  for (let y = 0; y <= 100 - block.height; y++) {
    for (let x = 0; x <= 12 - block.width; x++) candidates.push({ x, y });
  }
  return candidates.find(({ x, y }) => x + block.width <= 12 && y + block.height <= 100 && !hasBlockCollision({ ...block, id: "__candidate__", x, y }, blocks)) ?? null;
}

export function roomsToBlocks(rooms: RoomPlacement[]): FloorLayoutBlock[] {
  return rooms.map((room) => ({
    id: `room-${room.lagenhetsnummer}`,
    type: "apartment",
    x: room.side === "left" ? 0 : 8,
    y: room.position * 2,
    width: 4,
    height: 2,
    label: room.lagenhetsnummer,
    lagenhetsnummer: room.lagenhetsnummer,
  }));
}

export function validateLayoutBlocks(value: unknown): FloorLayoutBlock[] {
  if (!Array.isArray(value) || value.length > 500) throw new Error("Ritningen innehåller för många eller ogiltiga block.");
  const ids = new Set<string>();
  const blocks = value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Ritningen innehåller ett ogiltigt block.");
    const block = item as Record<string, unknown>;
    const type = block.type as FloorBlockType;
    const id = typeof block.id === "string" ? block.id : "";
    const label = typeof block.label === "string" ? block.label.trim().slice(0, 80) : "";
    const lagenhetsnummer = typeof block.lagenhetsnummer === "string" ? block.lagenhetsnummer.trim() : undefined;
    const x = Number(block.x), y = Number(block.y), width = Number(block.width), height = Number(block.height);
    if (!id || ids.has(id) || !["apartment", "common", "corridor", "blocked", "empty"].includes(type) || ![x, y, width, height].every(Number.isInteger) || x < 0 || y < 0 || width < 1 || height < 1 || x + width > 12 || y + height > 100) throw new Error("Ritningen innehåller ett ogiltigt block.");
    ids.add(id);
    return { id, type, x, y, width, height, label, ...(lagenhetsnummer ? { lagenhetsnummer } : {}) };
  });
  if (blocks.some((block) => hasBlockCollision(block, blocks))) throw new Error("Blocken i ritningen får inte överlappa varandra.");
  return blocks;
}

export function generateRoomNumbers(series: FloorSeries[]): string[] {
  const numbers = series.flatMap(({ prefix, start, end, padTo }) =>
    Array.from({ length: end - start + 1 }, (_, index) =>
      `${prefix}${String(start + index).padStart(padTo, "0")}`
    )
  );
  if (numbers.length > MAX_FLOOR_ROOMS) throw new Error(`En våning får innehålla högst ${MAX_FLOOR_ROOMS} bostäder.`);
  if (new Set(numbers).size !== numbers.length) throw new Error("Nummerserierna innehåller dubbletter.");
  return numbers;
}

export function placeRooms(numbers: string[], mode: PlacementMode): RoomPlacement[] {
  const midpoint = Math.ceil(numbers.length / 2);
  return normalizeRoomPositions(numbers.map((lagenhetsnummer, index) => {
    const alternating = mode.startsWith("alternating");
    const startsLeft = mode === "alternating_left" || mode === "left_first";
    const side = alternating
      ? ((index % 2 === 0) === startsLeft ? "left" : "right")
      : ((index < midpoint) === startsLeft ? "left" : "right");
    return { lagenhetsnummer, side, position: index };
  }));
}

export function normalizeRoomPositions(rooms: RoomPlacement[]): RoomPlacement[] {
  const positions = { left: 0, right: 0 };
  return rooms.map((room) => ({ ...room, position: positions[room.side]++ }));
}

export type ResidentMatch = { primary: string | null; others: Array<{ name: string; type: string }>; matchedBy: "exact" | "prefix" | "none" };
type Resident = { lagenhetsnummer: string; fastighet: string; namn: string; typ?: string };

export function matchResidents(
  roomNumber: string,
  buildingName: string,
  prefixes: string[],
  tenants: Resident[],
  others: Resident[]
): ResidentMatch {
  const candidates = [roomNumber, ...prefixes.filter((prefix) => roomNumber.startsWith(prefix)).map((prefix) => roomNumber.slice(prefix.length))];
  const find = (resident: Resident) => resident.fastighet === buildingName && candidates.includes(resident.lagenhetsnummer);
  const primary = tenants.find(find);
  const secondary = others.filter(find);
  return {
    primary: primary?.namn ?? null,
    others: secondary.map((resident) => ({ name: resident.namn, type: resident.typ ?? "andrahandsgast" })),
    matchedBy: primary || secondary.length ? (candidates[0] === (primary ?? secondary[0]).lagenhetsnummer ? "exact" : "prefix") : "none",
  };
}
