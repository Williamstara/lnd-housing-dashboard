"use server";

import { revalidatePath } from "next/cache";
import {
  archiveBesiktning,
  markBetalningGjord,
  markKlarForBetalning,
  updateBesiktning,
  type BesiktningEditInput,
} from "@/lib/besiktningar";
import { auth0 } from "@/lib/auth0";
import { requireNationsId } from "@/lib/nations";
import { ARCHIVE_ROLES, ROLES, getUserDisplayName, hasAnyRole, hasRole } from "@/lib/roles";

async function requireUser(): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.user) throw new Error("Unauthorized");
  return requireNationsId(session.user);
}

async function requireHusvdOrEkonomiRole(): Promise<{ nationsId: string; userName: string }> {
  const session = await auth0.getSession();
  if (!session?.user || !(hasRole(session.user, ROLES.HUSVD) || hasRole(session.user, ROLES.EKONOMI))) {
    throw new Error("Endast användare med rollen husvd eller ekonomi har åtkomst.");
  }
  return { nationsId: requireNationsId(session.user), userName: getUserDisplayName(session.user) };
}

async function requireArchiveRole(): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.user || !hasAnyRole(session.user, ARCHIVE_ROLES)) {
    throw new Error("Endast användare med rollen ekonomi, husvd eller admin har åtkomst.");
  }
  return requireNationsId(session.user);
}

function revalidateBesiktningarPages() {
  revalidatePath("/besiktningar");
  revalidatePath("/arkiv");
}

export async function updateBesiktningAction(id: string, input: BesiktningEditInput) {
  const nationsId = await requireUser();
  await updateBesiktning(nationsId, id, input);
  revalidateBesiktningarPages();
}

// Only husvd/ekonomi may progress a besiktning's payment status.
export async function markKlarForBetalningAction(id: string) {
  const { nationsId, userName } = await requireHusvdOrEkonomiRole();
  await markKlarForBetalning(nationsId, id, userName);
  revalidateBesiktningarPages();
}

export async function markBetalningGjordAction(id: string) {
  const { nationsId, userName } = await requireHusvdOrEkonomiRole();
  await markBetalningGjord(nationsId, id, userName);
  revalidateBesiktningarPages();
}

export async function archiveBesiktningAction(id: string) {
  const nationsId = await requireArchiveRole();
  await archiveBesiktning(nationsId, id);
  revalidateBesiktningarPages();
}
