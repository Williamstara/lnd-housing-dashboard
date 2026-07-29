// Pure types/data/helpers for the per-nation column config system — no
// "server-only" and no Mongo import, so client components (the admin page's
// column editor) can use it directly. lib/nation-settings.ts holds the
// Mongo-touching CRUD and re-exports these types.

export type TableKey = "apartments" | "rentalobjects";

export type TableColumnConfig = {
  key: string;
  label: string;
  visible: boolean;
  isCustom: boolean;
};

export type NationTableSettings = { columns: TableColumnConfig[] };

export type NationSettings = {
  nationsID: string;
  tables: Partial<Record<TableKey, NationTableSettings>>;
};

// Today's exact hardcoded column set for each table — what a nation with no
// saved settings gets, so nothing changes for anyone until an admin edits it.
export const DEFAULT_APARTMENT_COLUMNS: TableColumnConfig[] = [
  { key: "lagenhetsnummer", label: "Bostad", visible: true, isCustom: false },
  { key: "fastighet", label: "Fastighet", visible: true, isCustom: false },
  { key: "storlek", label: "Storlek", visible: true, isCustom: false },
  { key: "objekttyp", label: "Objekttyp", visible: true, isCustom: false },
  { key: "antalRum", label: "Antal rum", visible: true, isCustom: false },
  { key: "ledigFrom", label: "Ledig fr.o.m.", visible: true, isCustom: false },
  { key: "arshyra", label: "Årshyra", visible: true, isCustom: false },
  { key: "hyresrabatt", label: "Hyresrabatt", visible: true, isCustom: false },
  { key: "hyresreduktion", label: "H.red", visible: true, isCustom: false },
  { key: "arshyraMedRed", label: "Årshyra med red.", visible: true, isCustom: false },
  { key: "manadshyra", label: "Månadshyra", visible: true, isCustom: false },
  { key: "status", label: "Status", visible: true, isCustom: false },
];

export const DEFAULT_RENTALOBJECT_COLUMNS: TableColumnConfig[] = [
  { key: "lagenhetsnummer", label: "Lägenhetsnummer", visible: true, isCustom: false },
  { key: "fastighet", label: "Fastighet", visible: true, isCustom: false },
  { key: "typ", label: "Typ", visible: true, isCustom: false },
  { key: "area", label: "Area (m²)", visible: true, isCustom: false },
  { key: "areaInkKorr", label: "Ink korr", visible: true, isCustom: false },
  { key: "malbildshyra", label: "Målbildshyra", visible: true, isCustom: false },
  { key: "renoveringsbehov", label: "Renov", visible: true, isCustom: false },
  { key: "hyresrabatt", label: "Hyresrabatt", visible: true, isCustom: false },
  { key: "hyresred", label: "Hyresred", visible: true, isCustom: false },
  { key: "individuellArshyra", label: "Individuell år", visible: true, isCustom: false },
  { key: "manadshyra", label: "Månadshyra", visible: true, isCustom: false },
];

// A saved table's column list is always a full replacement (order,
// visibility, labels, and custom fields all encoded in one array) — no
// partial merge to reason about.
export function resolveColumns(
  defaults: TableColumnConfig[],
  saved: NationTableSettings | undefined
): TableColumnConfig[] {
  return saved?.columns ?? defaults;
}
