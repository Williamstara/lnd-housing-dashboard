import "server-only";
import { randomUUID } from "node:crypto";

// Mock store for confirmed lease terminations, same globalThis-cached
// in-memory approach as lib/apartments.ts — swap for a real collection
// later.

export type Uppsagning = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  hyresgastNamn: string;
  bekraftelsedatum: string; // ISO date the termination was confirmed
  flyttdatum: string; // ISO date the tenant moves out / apartment is ready
};

export type UppsagningInput = Omit<Uppsagning, "id">;

const globalStore = globalThis as typeof globalThis & {
  _uppsagningarStore?: Uppsagning[];
};

function getStore(): Uppsagning[] {
  if (!globalStore._uppsagningarStore) {
    globalStore._uppsagningarStore = [];
  }
  return globalStore._uppsagningarStore;
}

export async function getUppsagningar(): Promise<Uppsagning[]> {
  return getStore()
    .slice()
    .sort((a, b) => b.bekraftelsedatum.localeCompare(a.bekraftelsedatum));
}

export async function createUppsagning(
  input: UppsagningInput
): Promise<Uppsagning> {
  const record: Uppsagning = { ...input, id: randomUUID() };
  getStore().push(record);
  return record;
}
