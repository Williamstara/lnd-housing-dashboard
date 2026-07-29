import "server-only";
import { getDb } from "@/lib/mongodb";
import type { NationSettings, TableColumnConfig, TableKey } from "@/lib/table-columns";

export type { NationSettings, NationTableSettings, TableColumnConfig, TableKey } from "@/lib/table-columns";
export {
  DEFAULT_APARTMENT_COLUMNS,
  DEFAULT_RENTALOBJECT_COLUMNS,
  resolveColumns,
} from "@/lib/table-columns";

type NationSettingsDoc = NationSettings & { updatedAt: Date };

async function getCollection() {
  const db = await getDb();
  return db.collection<NationSettingsDoc>("nations");
}

export async function getNationSettings(nationsId: string): Promise<NationSettings | null> {
  const col = await getCollection();
  const doc = await col.findOne({ nationsID: nationsId }, { projection: { _id: 0 } });
  return doc ? { nationsID: doc.nationsID, tables: doc.tables } : null;
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
