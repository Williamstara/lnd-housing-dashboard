import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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
  DEFAULT_ANDRAHANDSGAST_IMPORT,
  DEFAULT_APARTMENT_COLUMNS,
  DEFAULT_APARTMENT_IMPORT,
  DEFAULT_BESIKTNING_IMPORT,
  DEFAULT_FASTIGHET_ALIASES,
  DEFAULT_RENTALOBJECT_COLUMNS,
  DEFAULT_RENTALOBJECT_SINGLE_IMPORT,
  DEFAULT_RENTALOBJECT_TAB_GROUPS,
  DEFAULT_TENANT_IMPORT,
  applyFastighetAlias,
  columnIndexToLetter,
  columnLetterToIndex,
  describeMapping,
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
};

const NATION_COLUMNS =
  "nations_id, tables, imports, rentalobjects_multi_tab, rentalobjects_tab_groups, fastighet_aliases" as const;

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
  };
}

export async function createNation(nationsId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("nations")
    .upsert({ nations_id: nationsId }, { onConflict: "nations_id", ignoreDuplicates: true });
  if (error) throw error;
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
