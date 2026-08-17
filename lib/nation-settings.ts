import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { findOrCreateNationOrg } from "@/lib/app-users";
import type { PermissionKey } from "@/lib/roles";
import type {
  FastighetAlias,
  ImportKey,
  ImportMapping,
  NationSettings,
  RentalObjectTabGroup,
  TableColumnConfig,
  TableKey,
} from "@/lib/table-columns";

export type {
  FastighetAlias,
  FeatureKey,
  ImportFieldConfig,
  ImportKey,
  ImportMapping,
  NationSettings,
  NationTableSettings,
  RentalObjectTabGroup,
  TableColumnConfig,
  TableKey,
} from "@/lib/table-columns";
export {
  DEFAULT_ANDRAHANDSGAST_COLUMNS,
  DEFAULT_ANDRAHANDSGAST_IMPORT,
  DEFAULT_APARTMENT_COLUMNS,
  DEFAULT_APARTMENT_IMPORT,
  DEFAULT_ARKIV_COLUMNS,
  DEFAULT_BESIKTNING_IMPORT,
  DEFAULT_FASTIGHET_ALIASES,
  DEFAULT_RENTALOBJECT_COLUMNS,
  DEFAULT_RENTALOBJECT_SINGLE_IMPORT,
  DEFAULT_RENTALOBJECT_TAB_GROUPS,
  DEFAULT_TENANT_COLUMNS,
  DEFAULT_TENANT_IMPORT,
  DEFAULT_TODO_COLUMNS,
  DEFAULT_UPPSAGNING_COLUMNS,
  FEATURES,
  FEATURE_LABELS,
  applyFastighetAlias,
  columnIndexToLetter,
  columnLetterToIndex,
  describeMapping,
  formatCurrency,
  formatCurrencyWithUnit,
  getCurrency,
  getLocale,
  isFeatureEnabled,
  mappingToLookup,
  resolveColumns,
  resolveFastighetAliases,
  resolveFastighetFromPrefix,
  resolveFastighetName,
  resolveImportMapping,
  resolveTabGroups,
} from "@/lib/table-columns";

type NationRow = {
  nations_id: string;
  tables: NationSettings["tables"] | null;
  imports: NationSettings["imports"] | null;
  rentalobjects_multi_tab: boolean | null;
  rentalobjects_tab_groups: RentalObjectTabGroup[] | null;
  fastighet_aliases: FastighetAlias[] | null;
  enabled_features: string[] | null;
  currency: string | null;
  locale: string | null;
};

const NATION_COLUMNS =
  "nations_id, tables, imports, rentalobjects_multi_tab, rentalobjects_tab_groups, fastighet_aliases, enabled_features, currency, locale" as const;

export async function getNationSettings(nationsId: string): Promise<NationSettings | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("nations")
    .select(NATION_COLUMNS)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as NationRow;
  return {
    nationsID: row.nations_id,
    tables: row.tables ?? {},
    imports: row.imports ?? undefined,
    rentalobjectsMultiTab: row.rentalobjects_multi_tab ?? undefined,
    rentalobjectsTabGroups: row.rentalobjects_tab_groups ?? undefined,
    fastighetAliases: row.fastighet_aliases ?? undefined,
    enabledFeatures: row.enabled_features ?? undefined,
    currency: row.currency ?? undefined,
    locale: row.locale ?? undefined,
  };
}

export async function saveCurrencyLocale(
  nationsId: string,
  currency: string,
  locale: string
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("nations")
    .upsert({ nations_id: nationsId, currency, locale }, { onConflict: "nations_id" });
  if (error) throw error;
}

export async function saveEnabledFeatures(nationsId: string, features: string[]): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("nations")
    .upsert({ nations_id: nationsId, enabled_features: features }, { onConflict: "nations_id" });
  if (error) throw error;
}

// "A nation exists" now means two things kept in sync: a Postgres row (the
// tenant-scoping foreign key every table references) and a Clerk
// Organization (the identity-provider side of the same tenant — see
// lib/app-users.ts's findOrCreateNationOrg). Both are idempotent, so this
// stays safe to call from both createNationAction (standalone) and
// assignNationsIdAction (assigning a user to a nation that may not exist
// yet).
export async function createNation(nationsId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("nations")
    .upsert({ nations_id: nationsId }, { onConflict: "nations_id", ignoreDuplicates: true });
  if (error) throw error;
  await findOrCreateNationOrg(nationsId);
}

// tables/imports are JSONB objects keyed by table/import name — Mongo could
// $set just one dot-path key atomically; Postgres has no equivalent through
// the query builder without an RPC, so this reads the current object,
// merges the one key in JS, and writes the whole object back. A real race
// (two admins editing different keys for the same nation at the same
// instant) could lose an update, but this is a single-admin-at-a-time
// config screen — not worth a stored procedure for that edge case.
export async function saveTableSettings(
  nationsId: string,
  table: TableKey,
  columns: TableColumnConfig[]
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("nations")
    .select("tables")
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  const tables = { ...(existing?.tables ?? {}), [table]: { columns } };
  const { error } = await supabase
    .from("nations")
    .upsert({ nations_id: nationsId, tables }, { onConflict: "nations_id" });
  if (error) throw error;
}

export async function saveImportMapping(
  nationsId: string,
  key: ImportKey,
  fields: ImportMapping["fields"]
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("nations")
    .select("imports")
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  const imports = { ...(existing?.imports ?? {}), [key]: { fields } };
  const { error } = await supabase
    .from("nations")
    .upsert({ nations_id: nationsId, imports }, { onConflict: "nations_id" });
  if (error) throw error;
}

export async function setRentalobjectsMultiTab(nationsId: string, multiTab: boolean): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("nations")
    .upsert({ nations_id: nationsId, rentalobjects_multi_tab: multiTab }, { onConflict: "nations_id" });
  if (error) throw error;
}

export async function saveRentalobjectTabGroups(
  nationsId: string,
  groups: RentalObjectTabGroup[]
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("nations")
    .upsert({ nations_id: nationsId, rentalobjects_tab_groups: groups }, { onConflict: "nations_id" });
  if (error) throw error;
}

export async function saveFastighetAliases(
  nationsId: string,
  aliases: FastighetAlias[]
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("nations")
    .upsert({ nations_id: nationsId, fastighet_aliases: aliases }, { onConflict: "nations_id" });
  if (error) throw error;
}

export type NationRolePermissions = Partial<Record<PermissionKey, string[]>>;

// nation_role_permissions is its own table (not a nations.* JSONB column,
// unlike the settings above) since it's a proper many-rows-per-nation
// relation, not a single blob. Empty result = nation has no saved
// overrides = lib/roles.ts's hasPermission falls back to
// DEFAULT_PERMISSION_ROLES for every key.
export async function getNationRolePermissions(nationsId: string): Promise<NationRolePermissions> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("nation_role_permissions")
    .select("role_name, permission_key")
    .eq("nations_id", nationsId);
  if (error) throw error;
  const result: NationRolePermissions = {};
  for (const row of data as { role_name: string; permission_key: string }[]) {
    const key = row.permission_key as PermissionKey;
    (result[key] ??= []).push(row.role_name);
  }
  return result;
}

// Full replace, not a per-key patch — the admin editor always submits the
// complete mapping (every permission key present, even if its role list is
// empty), so there's no partial-update case to reconcile. Delete-then-insert
// isn't wrapped in a transaction (no RPC/stored procedure for it), so a
// failure between the two leaves the nation with zero saved rows — falling
// back to DEFAULT_PERMISSION_ROLES, not data loss, and this is a
// single-admin-at-a-time config screen — same tradeoff already accepted for
// saveTableSettings above.
export async function saveNationRolePermissions(
  nationsId: string,
  mapping: NationRolePermissions
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error: deleteError } = await supabase
    .from("nation_role_permissions")
    .delete()
    .eq("nations_id", nationsId);
  if (deleteError) throw deleteError;

  const rows = Object.entries(mapping).flatMap(([permissionKey, roles]) =>
    (roles ?? []).map((roleName) => ({
      nations_id: nationsId,
      role_name: roleName,
      permission_key: permissionKey,
    }))
  );
  if (rows.length === 0) return;
  const { error: insertError } = await supabase.from("nation_role_permissions").insert(rows);
  if (insertError) throw insertError;
}

// nations is now a real registry table (every nation gets a row, created
// first in the migration) instead of Mongo's inferred-by-distinct-across-
// every-collection approach — this is now a plain select.
export async function listAllNationIds(): Promise<string[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("nations").select("nations_id");
  if (error) throw error;
  return (data as { nations_id: string }[])
    .map((r) => r.nations_id)
    .sort((a, b) => a.localeCompare(b, "sv", { sensitivity: "base" }));
}
