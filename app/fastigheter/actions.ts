"use server";

import { revalidatePath } from "next/cache";
import { createFastighet, deleteFastighet, updateFastighet } from "@/lib/fastigheter";
import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/roles";

async function requireHusformanRole(): Promise<string> {
  const { nationsId } = await requirePermission(
    PERMISSIONS.FASTIGHETER_MANAGE,
    "Endast användare med rollen husförman har åtkomst."
  );
  return nationsId;
}

function cleanPrefixes(prefixes: string[]): string[] {
  return Array.from(new Set(prefixes.map((p) => p.trim().toUpperCase()).filter(Boolean)));
}

export async function createFastighetAction(namn: string, prefixes: string[] = []) {
  const nationsId = await requireHusformanRole();
  const trimmed = namn.trim();
  if (!trimmed) throw new Error("Namn krävs.");
  await createFastighet(nationsId, trimmed, cleanPrefixes(prefixes));
  revalidatePath("/fastigheter");
  revalidatePath("/lediga-lagenheter");
}

export async function updateFastighetAction(id: string, namn: string, prefixes: string[]) {
  const nationsId = await requireHusformanRole();
  const trimmed = namn.trim();
  if (!trimmed) throw new Error("Namn krävs.");
  await updateFastighet(nationsId, id, trimmed, cleanPrefixes(prefixes));
  revalidatePath("/fastigheter");
  revalidatePath("/lediga-lagenheter");
}

export async function deleteFastighetAction(id: string) {
  const nationsId = await requireHusformanRole();
  await deleteFastighet(nationsId, id);
  revalidatePath("/fastigheter");
}
