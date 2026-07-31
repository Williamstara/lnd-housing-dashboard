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

export type ImportKey = "tenants" | "andrahandsgaster" | "besiktningar" | "rentalobjects_single";

// column is 0-based (spreadsheet column A = 0); -1 means "not present in
// this sheet" — the parser treats it as an always-empty cell, so downstream
// fields just come out null/blank rather than erroring.
export type ImportFieldConfig = { field: string; label: string; column: number };
export type ImportMapping = { fields: ImportFieldConfig[] };

// One admin-defined sheet/tab in multi-tab mode: which sheets belong to it
// (by name substring), what to prepend to lägenhetsnummer for rows read from
// it, and its own column mapping. A nation can have as many or as few of
// these as its actual spreadsheet needs — nothing about the count, names, or
// fields is fixed.
export type RentalObjectTabGroup = {
  id: string;
  name: string;
  matchers: string[];
  prefix: string;
  fields: ImportFieldConfig[];
};

export type NationSettings = {
  nationsID: string;
  tables: Partial<Record<TableKey, NationTableSettings>>;
  imports?: Partial<Record<ImportKey, ImportMapping>>;
  // Most nations keep every rental object on one sheet — multiple tabs is
  // the opt-in exception.
  rentalobjectsMultiTab?: boolean;
  rentalobjectsTabGroups?: RentalObjectTabGroup[];
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

// Today's exact hardcoded xlsx column positions for each importer —
// transcribed from the parsers so an unconfigured nation imports identically
// to before this existed.
export const DEFAULT_TENANT_IMPORT: ImportMapping = {
  fields: [
    { field: "fastighet", label: "Fastighet", column: 1 },
    { field: "lagenhetsnummer", label: "Lägenhetsnummer", column: 3 },
    { field: "namn", label: "Namn", column: 4 },
    { field: "personnummer", label: "Personnummer", column: 5 },
    { field: "mejladress", label: "E-post", column: 6 },
    { field: "telefonnummer", label: "Telefon", column: 7 },
  ],
};

// Same spreadsheet layout as tenants today, but edited independently — a
// nation isn't forced to keep the two identical.
export const DEFAULT_ANDRAHANDSGAST_IMPORT: ImportMapping = {
  fields: [
    { field: "fastighet", label: "Fastighet", column: 1 },
    { field: "lagenhetsnummer", label: "Lägenhetsnummer", column: 3 },
    { field: "namn", label: "Namn", column: 4 },
    { field: "personnummer", label: "Personnummer", column: 5 },
    { field: "mejladress", label: "E-post", column: 6 },
    { field: "telefonnummer", label: "Telefon", column: 7 },
  ],
};

export const DEFAULT_BESIKTNING_IMPORT: ImportMapping = {
  fields: [
    { field: "besiktningsdatum", label: "Besiktningsdatum", column: 0 },
    { field: "lagenhetsnummer", label: "Lägenhetsnummer", column: 1 },
    { field: "kostnadStadning", label: "Kostnad städ", column: 2 },
    { field: "vaktmastareAnteckning", label: "Kommentar vaktmästare", column: 3 },
    { field: "godkand", label: "Godkänd (Ja/Nej)", column: 4 },
    { field: "husformanAnteckning", label: "Husförman kommentar", column: 5 },
    { field: "totaltAvdrag", label: "Totalt avdrag", column: 6 },
  ],
};

// Standard mode: everything on one sheet, no building-type prefix applied to
// lägenhetsnummer. Sequential columns A-I since there's no legacy layout to
// match — this is what a brand-new nation starts from.
export const DEFAULT_RENTALOBJECT_SINGLE_IMPORT: ImportMapping = {
  fields: [
    { field: "fastighet", label: "Fastighet", column: 0 },
    { field: "lagenhetsnummer", label: "Lägenhetsnummer", column: 1 },
    { field: "typ", label: "Typ", column: 2 },
    { field: "area", label: "Area", column: 3 },
    { field: "areaInkKorr", label: "Area ink korr", column: 4 },
    { field: "malbildshyra", label: "Målbildshyra", column: 5 },
    { field: "renoveringsbehov", label: "Renoveringsbehov", column: 6 },
    { field: "hyresrabatt", label: "Hyresrabatt", column: 7 },
    { field: "hyresred", label: "Hyresred", column: 8 },
  ],
};

// Multi-tab mode (opt-in) seed — matches the layout this system replaced,
// as a starting point an admin can rename, add to, remove from, or repoint
// at different sheet names. -1 = that column doesn't exist on this tab.
export const DEFAULT_RENTALOBJECT_TAB_GROUPS: RentalObjectTabGroup[] = [
  {
    id: "finn",
    name: "Finn huset",
    matchers: ["finn"],
    prefix: "FH",
    fields: [
      { field: "fastighet", label: "Fastighet", column: 0 },
      { field: "lagenhetsnummer", label: "Lägenhetsnummer", column: 1 },
      { field: "typ", label: "Typ", column: 8 },
      { field: "area", label: "Area", column: 6 },
      { field: "areaInkKorr", label: "Area ink korr", column: -1 },
      { field: "malbildshyra", label: "Målbildshyra", column: 3 },
      { field: "renoveringsbehov", label: "Renoveringsbehov", column: -1 },
      { field: "hyresrabatt", label: "Hyresrabatt", column: -1 },
      { field: "hyresred", label: "Hyresred", column: -1 },
    ],
  },
  {
    id: "gh",
    name: "GH",
    matchers: ["gh", "st35", "st 35"],
    prefix: "GH",
    fields: [
      { field: "fastighet", label: "Fastighet", column: 0 },
      { field: "lagenhetsnummer", label: "Lägenhetsnummer", column: 1 },
      { field: "typ", label: "Typ", column: 4 },
      { field: "area", label: "Area", column: 2 },
      { field: "areaInkKorr", label: "Area ink korr", column: 3 },
      { field: "malbildshyra", label: "Målbildshyra", column: 5 },
      { field: "renoveringsbehov", label: "Renoveringsbehov", column: 9 },
      { field: "hyresrabatt", label: "Hyresrabatt", column: 10 },
      { field: "hyresred", label: "Hyresred", column: 11 },
    ],
  },
  {
    id: "nh",
    name: "NH",
    matchers: ["nh", "st39", "st 39"],
    prefix: "NH",
    fields: [
      { field: "fastighet", label: "Fastighet", column: 0 },
      { field: "lagenhetsnummer", label: "Lägenhetsnummer", column: 1 },
      { field: "typ", label: "Typ", column: 4 },
      { field: "area", label: "Area", column: 2 },
      { field: "areaInkKorr", label: "Area ink korr", column: 3 },
      { field: "malbildshyra", label: "Målbildshyra", column: 5 },
      { field: "renoveringsbehov", label: "Renoveringsbehov", column: 9 },
      { field: "hyresrabatt", label: "Hyresrabatt", column: 10 },
      { field: "hyresred", label: "Hyresred", column: 11 },
    ],
  },
  {
    id: "arkivet_b",
    name: "Arkivet B",
    matchers: ["arkivet b", "arkivetb"],
    prefix: "B",
    fields: [
      { field: "fastighet", label: "Fastighet", column: 0 },
      { field: "lagenhetsnummer", label: "Lägenhetsnummer", column: 1 },
      { field: "typ", label: "Typ", column: 4 },
      { field: "area", label: "Area", column: 2 },
      { field: "areaInkKorr", label: "Area ink korr", column: 3 },
      { field: "malbildshyra", label: "Målbildshyra", column: 6 },
      { field: "renoveringsbehov", label: "Renoveringsbehov", column: 11 },
      { field: "hyresrabatt", label: "Hyresrabatt", column: 12 },
      { field: "hyresred", label: "Hyresred", column: -1 },
    ],
  },
  {
    id: "arkivet_c",
    name: "Arkivet C",
    matchers: ["arkivet c", "arkivetc"],
    prefix: "C",
    fields: [
      { field: "fastighet", label: "Fastighet", column: 0 },
      { field: "lagenhetsnummer", label: "Lägenhetsnummer", column: 1 },
      { field: "typ", label: "Typ", column: 4 },
      { field: "area", label: "Area", column: 2 },
      { field: "areaInkKorr", label: "Area ink korr", column: 3 },
      { field: "malbildshyra", label: "Målbildshyra", column: 6 },
      { field: "renoveringsbehov", label: "Renoveringsbehov", column: 11 },
      { field: "hyresrabatt", label: "Hyresrabatt", column: 12 },
      { field: "hyresred", label: "Hyresred", column: -1 },
    ],
  },
  {
    id: "arkivet_d",
    name: "Arkivet D",
    matchers: ["arkivet d", "arkivetd"],
    prefix: "D",
    fields: [
      { field: "fastighet", label: "Fastighet", column: 0 },
      { field: "lagenhetsnummer", label: "Lägenhetsnummer", column: 1 },
      { field: "typ", label: "Typ", column: 4 },
      { field: "area", label: "Area", column: 2 },
      { field: "areaInkKorr", label: "Area ink korr", column: 3 },
      { field: "malbildshyra", label: "Målbildshyra", column: 6 },
      { field: "renoveringsbehov", label: "Renoveringsbehov", column: 11 },
      { field: "hyresrabatt", label: "Hyresrabatt", column: 12 },
      { field: "hyresred", label: "Hyresred", column: -1 },
    ],
  },
];

export function resolveTabGroups(
  defaults: RentalObjectTabGroup[],
  saved: RentalObjectTabGroup[] | undefined
): RentalObjectTabGroup[] {
  return saved ?? defaults;
}

// A saved import mapping is always a full replacement, same as resolveColumns.
export function resolveImportMapping(
  defaults: ImportMapping,
  saved: ImportMapping | undefined
): ImportMapping {
  return saved ?? defaults;
}

// Spreadsheet column letters: A=0, Z=25, AA=26, ...
export function columnIndexToLetter(index: number): string {
  let n = index + 1;
  let letters = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

export function columnLetterToIndex(letter: string): number {
  const cleaned = letter.trim().toUpperCase();
  let n = 0;
  for (const ch of cleaned) {
    const code = ch.charCodeAt(0) - 64;
    if (code < 1 || code > 26) return -1;
    n = n * 26 + code;
  }
  return n - 1;
}

// field -> 0-based column index, for a parser to look up quickly.
export function mappingToLookup(mapping: ImportMapping): Record<string, number> {
  return Object.fromEntries(mapping.fields.map((f) => [f.field, f.column]));
}

// "B = fastighet, D = lägenhetsnummer, ..." sorted by column, for the
// dialog's on-screen description. Fields with column -1 ("not present on
// this sheet") are left out — there's nothing to say about them.
export function describeMapping(mapping: ImportMapping): string {
  return mapping.fields
    .filter((f) => f.column >= 0)
    .sort((a, b) => a.column - b.column)
    .map((f) => `${columnIndexToLetter(f.column)} = ${f.label}`)
    .join(", ");
}
