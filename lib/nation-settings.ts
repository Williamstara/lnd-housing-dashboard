import "server-only";
import { getDb } from "@/lib/mongodb";
import type {
  ImportKey,
  ImportMapping,
  NationSettings,
  RentalObjectTabGroup,
  TableColumnConfig,
  TableKey,
} from "@/lib/table-columns";

export type {
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
  DEFAULT_BESIKTNING_IMPORT,
  DEFAULT_RENTALOBJECT_COLUMNS,
  DEFAULT_RENTALOBJECT_SINGLE_IMPORT,
  DEFAULT_RENTALOBJECT_TAB_GROUPS,
  DEFAULT_TENANT_IMPORT,
  columnIndexToLetter,
  columnLetterToIndex,
  describeMapping,
  mappingToLookup,
  resolveColumns,
  resolveImportMapping,
  resolveTabGroups,
} from "@/lib/table-columns";

type NationSettingsDoc = NationSettings & { updatedAt: Date };

async function getCollection() {
  const db = await getDb();
  return db.collection<NationSettingsDoc>("nations");
}

export async function getNationSettings(nationsId: string): Promise<NationSettings | null> {
  const col = await getCollection();
  const doc = await col.findOne({ nationsID: nationsId }, { projection: { _id: 0 } });
  return doc
    ? {
        nationsID: doc.nationsID,
        tables: doc.tables,
        imports: doc.imports,
        rentalobjectsMultiTab: doc.rentalobjectsMultiTab,
        rentalobjectsTabGroups: doc.rentalobjectsTabGroups,
      }
    : null;
}

export async function createNation(nationsId: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { nationsID: nationsId },
    { $setOnInsert: { nationsID: nationsId, tables: {} }, $set: { updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function saveTableSettings(
  nationsId: string,
  table: TableKey,
  columns: TableColumnConfig[]
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { nationsID: nationsId },
    { $set: { [`tables.${table}`]: { columns }, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function saveImportMapping(
  nationsId: string,
  key: ImportKey,
  fields: ImportMapping["fields"]
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { nationsID: nationsId },
    { $set: { [`imports.${key}`]: { fields }, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function setRentalobjectsMultiTab(nationsId: string, multiTab: boolean): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { nationsID: nationsId },
    { $set: { rentalobjectsMultiTab: multiTab, updatedAt: new Date() } },
    { upsert: true }
  );
}

export async function saveRentalobjectTabGroups(
  nationsId: string,
  groups: RentalObjectTabGroup[]
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { nationsID: nationsId },
    { $set: { rentalobjectsTabGroups: groups, updatedAt: new Date() } },
    { upsert: true }
  );
}

// Every nation-scoped collection in the app — a nation only needs a row in
// one of these (not necessarily apartments/rentalobjects/tenants) to show
// up in the admin picker.
const NATION_SCOPED_COLLECTIONS = [
  "apartments",
  "rentalobjects",
  "tenants",
  "fastigheter",
  "todos",
  "uppsagningar",
  "besiktningar",
  "mail-templates",
  "floor-plans",
  "missed-rent",
  "andrahandsgaster",
  "nations",
];

// Every nationsID known to the app: either it already has data, or an admin
// has already created settings for it. Lets the admin page offer a picker
// without needing to ask Auth0 at all.
export async function listAllNationIds(): Promise<string[]> {
  const db = await getDb();
  const results = await Promise.all(
    NATION_SCOPED_COLLECTIONS.map((name) => db.collection(name).distinct("nationsID"))
  );
  const ids = new Set<string>(results.flat());
  return Array.from(ids).sort((a, b) => a.localeCompare(b, "sv", { sensitivity: "base" }));
}
