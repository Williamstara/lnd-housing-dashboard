"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { createFastighet, deleteFastighet, updateFastighet } from "@/lib/fastigheter";
import { requireNationsId } from "@/lib/nations";
import { ROLES, hasRole } from "@/lib/roles";

async function requireHusformanRole(): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.user || !hasRole(session.user, ROLES.HUSFORMAN)) {
    throw new Error("Endast användare med rollen husförman har åtkomst.");
  }
  return requireNationsId(session.user);
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
