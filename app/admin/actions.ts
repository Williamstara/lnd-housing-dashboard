"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { ROLES, hasRole } from "@/lib/roles";
import { assignNationsId, assignRoles, deleteUser, getAvailableRoles, type AppRole } from "@/lib/app-users";
import {
  createNation,
  getNationSettings,
  saveFastighetAliases,
  saveImportMapping,
  saveRentalobjectTabGroups,
  saveTableSettings,
  setRentalobjectsMultiTab,
  type FastighetAlias,
  type ImportFieldConfig,
  type ImportKey,
  type NationSettings,
  type RentalObjectTabGroup,
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

export async function saveImportMappingAction(
  nationsId: string,
  key: ImportKey,
  fields: ImportFieldConfig[]
): Promise<void> {
  await requireAdmin();
  await saveImportMapping(nationsId, key, fields);
  revalidatePath("/hyresgastlista");
  revalidatePath("/besiktningar");
  revalidatePath("/databas");
  revalidatePath("/lediga-lagenheter");
}

export async function saveRentalobjectsMultiTabAction(nationsId: string, multiTab: boolean): Promise<void> {
  await requireAdmin();
  await setRentalobjectsMultiTab(nationsId, multiTab);
  revalidatePath("/databas");
}

export async function saveRentalobjectTabGroupsAction(
  nationsId: string,
  groups: RentalObjectTabGroup[]
): Promise<void> {
  await requireAdmin();
  await saveRentalobjectTabGroups(nationsId, groups);
  revalidatePath("/databas");
}

export async function saveFastighetAliasesAction(
  nationsId: string,
  aliases: FastighetAlias[]
): Promise<void> {
  await requireAdmin();
  await saveFastighetAliases(nationsId, aliases);
  revalidatePath("/hyresgastlista");
  revalidatePath("/databas");
}

export async function getAvailableRolesAction(): Promise<AppRole[]> {
  await requireAdmin();
  return getAvailableRoles();
}

export async function assignNationsIdAction(
  sub: string,
  nationsId: string,
  roleIds: string[]
): Promise<void> {
  await requireAdmin();
  const trimmed = nationsId.trim();
  if (!trimmed) throw new Error("nationsID krävs.");
  await createNation(trimmed);
  await assignNationsId(sub, trimmed);
  if (roleIds.length > 0) {
    await assignRoles(sub, roleIds);
  }
  revalidatePath("/admin");
}

export async function deleteUserAction(sub: string): Promise<void> {
  await requireAdmin();
  await deleteUser(sub);
  revalidatePath("/admin");
}
