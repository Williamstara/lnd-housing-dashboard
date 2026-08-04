"use server";

import { revalidatePath } from "next/cache";
import {
  archiveBesiktning,
  archiveBesiktningarBulk,
  bulkUpsertBesiktningar,
  createManualBesiktning,
  deleteBesiktning,
  markBetalningGjord,
  markBetalningGjordBulk,
  markKlarForBetalning,
  markKlarForBetalningBulk,
  updateBesiktning,
  type BesiktningEditInput,
  type BesiktningImportInput,
  type BulkActionResult,
  type BulkUpsertResult,
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

// Archiving besiktningar is husvd/admin only — ekonomi lost this right
// (unlike deleteBesiktningAction above and every other "archive" feature in
// the app, which still use the broader requireArchiveRole/ARCHIVE_ROLES).
async function requireHusvdRole(): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.user || !hasRole(session.user, ROLES.HUSVD)) {
    throw new Error("Endast användare med rollen husvd eller admin har åtkomst.");
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

export async function createBesiktningAction(input: BesiktningImportInput) {
  const nationsId = await requireUser();
  if (!input.lagenhetsnummer.trim()) throw new Error("Lägenhetsnummer krävs.");
  if (!input.besiktningsdatum) throw new Error("Besiktningsdatum krävs.");
  await createManualBesiktning(nationsId, input);
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

export async function markKlarForBetalningBulkAction(ids: string[]): Promise<BulkActionResult> {
  const { nationsId, userName } = await requireHusvdOrEkonomiRole();
  if (ids.length === 0) return { updated: 0, skipped: 0 };
  const result = await markKlarForBetalningBulk(nationsId, ids, userName);
  revalidateBesiktningarPages();
  return result;
}

export async function markBetalningGjordBulkAction(ids: string[]): Promise<BulkActionResult> {
  const { nationsId, userName } = await requireHusvdOrEkonomiRole();
  if (ids.length === 0) return { updated: 0, skipped: 0 };
  const result = await markBetalningGjordBulk(nationsId, ids, userName);
  revalidateBesiktningarPages();
  return result;
}

export async function archiveBesiktningAction(id: string) {
  const nationsId = await requireHusvdRole();
  await archiveBesiktning(nationsId, id);
  revalidateBesiktningarPages();
}

export async function archiveBesiktningarBulkAction(ids: string[]): Promise<BulkActionResult> {
  const nationsId = await requireHusvdRole();
  if (ids.length === 0) return { updated: 0, skipped: 0 };
  const result = await archiveBesiktningarBulk(nationsId, ids);
  revalidateBesiktningarPages();
  return result;
}

export async function deleteBesiktningAction(id: string) {
  const nationsId = await requireArchiveRole();
  await deleteBesiktning(nationsId, id);
  revalidateBesiktningarPages();
}

export async function importBesiktningarFromExcelAction(
  rows: BesiktningImportInput[]
): Promise<BulkUpsertResult> {
  const nationsId = await requireUser();
  if (rows.length === 0) throw new Error("Inga rader att importera.");
  const result = await bulkUpsertBesiktningar(nationsId, rows);
  revalidateBesiktningarPages();
  return result;
}
