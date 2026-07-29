"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { ROLES, hasRole } from "@/lib/roles";
import { assignNationsId, deleteUser } from "@/lib/app-users";
import {
  createNation,
  getNationSettings,
  saveTableSettings,
  type NationSettings,
  type TableColumnConfig,
  type TableKey,
} from "@/lib/nation-settings";

async function requireAdmin(): Promise<void> {
  const session = await auth0.getSession();
  if (!session?.user || !hasRole(session.user, ROLES.ADMIN)) {
    throw new Error("Endast administratörer har åtkomst.");
  }
}

export async function getNationSettingsAction(nationsId: string): Promise<NationSettings | null> {
  await requireAdmin();
  return getNationSettings(nationsId);
}

export async function createNationAction(nationsId: string): Promise<void> {
  await requireAdmin();
  const trimmed = nationsId.trim();
  if (!trimmed) throw new Error("nationsID krävs.");
  await createNation(trimmed);
  revalidatePath("/admin");
}

export async function saveTableColumnsAction(
  nationsId: string,
  table: TableKey,
  columns: TableColumnConfig[]
): Promise<void> {
  await requireAdmin();
  await saveTableSettings(nationsId, table, columns);
  revalidatePath("/lediga-lagenheter");
  revalidatePath("/databas");
}

export async function assignNationsIdAction(sub: string, nationsId: string): Promise<void> {
  await requireAdmin();
  const trimmed = nationsId.trim();
  if (!trimmed) throw new Error("nationsID krävs.");
  await createNation(trimmed);
  await assignNationsId(sub, trimmed);
  revalidatePath("/admin");
}

export async function deleteUserAction(sub: string): Promise<void> {
  await requireAdmin();
  await deleteUser(sub);
  revalidatePath("/admin");
}
