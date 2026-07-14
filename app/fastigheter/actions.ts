"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { createFastighet, deleteFastighet, updateFastighet } from "@/lib/fastigheter";
import { requireNationsId } from "@/lib/nations";
import { ROLES, hasRole } from "@/lib/roles";

async function requireAdminRole(): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.user || !hasRole(session.user, ROLES.ADMIN)) {
    throw new Error("Endast användare med rollen admin har åtkomst.");
  }
  return requireNationsId(session.user);
}

export async function createFastighetAction(namn: string) {
  const nationsId = await requireAdminRole();
  const trimmed = namn.trim();
  if (!trimmed) throw new Error("Namn krävs.");
  await createFastighet(nationsId, trimmed);
  revalidatePath("/fastigheter");
}

export async function updateFastighetAction(id: string, namn: string) {
  const nationsId = await requireAdminRole();
  const trimmed = namn.trim();
  if (!trimmed) throw new Error("Namn krävs.");
  await updateFastighet(nationsId, id, trimmed);
  revalidatePath("/fastigheter");
}

export async function deleteFastighetAction(id: string) {
  const nationsId = await requireAdminRole();
  await deleteFastighet(nationsId, id);
  revalidatePath("/fastigheter");
}
