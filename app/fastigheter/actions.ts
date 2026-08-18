"use server";

import { revalidatePath } from "next/cache";
import { createFastighet, deleteFastighet, updateFastighet } from "@/lib/fastigheter";
import { validateLayoutBlocks } from "@/lib/building-floor-logic";
import { deleteBuildingFloorTemplate, saveBuildingFloorTemplate } from "@/lib/building-floor-templates";
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

export async function saveFloorTemplateAction(name: string, blocksValue: unknown) {
  const nationsId = await requireHusformanRole();
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 80) throw new Error("Ange ett mallnamn med högst 80 tecken.");
  const blocks = validateLayoutBlocks(blocksValue).map((block) => block.type === "apartment" ? { ...block, lagenhetsnummer: undefined } : block);
  await saveBuildingFloorTemplate(nationsId, cleanName, blocks);
  revalidatePath("/fastigheter");
  revalidatePath("/bostadskarta");
}

export async function deleteFloorTemplateAction(id: string) {
  const nationsId = await requireHusformanRole();
  await deleteBuildingFloorTemplate(nationsId, id);
  revalidatePath("/fastigheter");
  revalidatePath("/bostadskarta");
}
