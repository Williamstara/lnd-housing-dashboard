// Pure types/data/helpers for the per-nation column config system — no
// "server-only" and no Mongo import, so client components (the admin page's
// column editor) can use it directly. lib/nation-settings.ts holds the
// Mongo-touching CRUD and re-exports these types.

export type TableKey =
  | "apartments"
  | "rentalobjects"
  | "tenants"
  | "andrahandsgaster"
  | "arkiv"
  | "uppsagning"
  | "todo";

export type TableColumnConfig = {
  key: string;
  label: string;
  visible: boolean;
  isCustom: boolean;
};

export type NationTableSettings = { columns: TableColumnConfig[] };

export type ImportKey =
  | "tenants"
  | "andrahandsgaster"
  | "besiktningar"
  | "rentalobjects_single"
  | "apartments";

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

// Maps a raw spreadsheet "Fastighet" cell value (matched trimmed,
// case-insensitively) to the canonical fastighet name stored in the
// fastigheter collection — for nations whose sheet uses abbreviations or
// alternate spellings that don't literally match the registered name.
export type FastighetAlias = { alias: string; fastighet: string };

export type NationSettings = {
  nationsID: string;
  tables: Partial<Record<TableKey, NationTableSettings>>;
  imports?: Partial<Record<ImportKey, ImportMapping>>;
  // Most nations keep every rental object on one sheet — multiple tabs is
  // the opt-in exception.
  rentalobjectsMultiTab?: boolean;
  rentalobjectsTabGroups?: RentalObjectTabGroup[];
  fastighetAliases?: FastighetAlias[];
  // undefined = every feature enabled (today's behavior for every nation) —
  // see isFeatureEnabled below.
  enabledFeatures?: string[];
  // docs/SAAS-READINESS-ROADMAP.md Tier 6.1 — undefined = "kr", LND's
  // existing hardcoded suffix (see formatCurrency below).
  currency?: string;
  // Tier 6.2 — undefined = "sv-SE", used for currency/date Intl formatting
  // (formatCurrency/formatDate below). Deliberately NOT threaded through
  // this codebase's ~26 toLocaleLowerCase("sv")/localeCompare("sv", ...)
  // search-filter and sort-comparator call sites across every *Table.tsx —
  // every nation currently in discussion is a Swedish-language
  // organization, so hardcoded Swedish string collation is correct for all
  // of them today. Revisit only if a genuinely non-Swedish-language nation
  // is onboarded; until then that sweep has real mechanical cost (12+
  // files) for no actual behavior difference.
  locale?: string;
};

// Opt-out feature flags for integrations/workflow steps that don't apply to
// every nation (docs/SAAS-READINESS-ROADMAP.md Tier 3.2 + 5.2's flag half +
// 7.1) — gates nav entry points and UI, not the underlying data/columns
// (those stay in place either way, so turning a feature back on never loses
// anything).
export const FEATURES = {
  GMAIL_EPOST: "gmail_epost",
  LAUNDRY_ACCOUNTS: "laundry_accounts",
  KEY_HANDOVER: "key_handover",
} as const;

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES];

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  [FEATURES.GMAIL_EPOST]: "E-post (Gmail-utskick, mallar)",
  [FEATURES.LAUNDRY_ACCOUNTS]: "Tvättstugekonton",
  [FEATURES.KEY_HANDOVER]: "Nyckelhantering (inlämnad/hämtad)",
};

// Takes the raw array (not the whole NationSettings) so call sites that
// only ever have the array on hand — NavBar, which receives just
// enabledFeatures as a prop rather than full settings — don't need a fake
// NationSettings wrapper just to call this.
export function isFeatureEnabled(
  enabledFeatures: string[] | null | undefined,
  feature: FeatureKey | null | undefined
): boolean {
  if (!feature) return true;
  return enabledFeatures === undefined || enabledFeatures === null || enabledFeatures.includes(feature);
}

export function getLocale(settings: NationSettings | null | undefined): string {
  return settings?.locale ?? "sv-SE";
}

export function getCurrency(settings: NationSettings | null | undefined): string {
  return settings?.currency ?? "kr";
}

// Matches the exact current output of every existing
// `new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(x)`
// call site (bare formatted number, no unit suffix) — a nation-aware
// drop-in replacement, not a behavior change for LND today.
export function formatCurrency(value: number, settings?: NationSettings | null): string {
  return new Intl.NumberFormat(getLocale(settings), { maximumFractionDigits: 0 }).format(value);
}

// For call sites that also want the unit suffix (e.g. "1 234 kr").
export function formatCurrencyWithUnit(value: number, settings?: NationSettings | null): string {
  return `${formatCurrency(value, settings)} ${getCurrency(settings)}`;
}

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

// docs/SAAS-READINESS-ROADMAP.md Tier 4.2 — these five follow the identical
// *Table.tsx list-rendering shape as apartments/rentalobjects above, just
// not wired to admin column config until now. None of these row types have
// a `custom: Record<string, string>` bag the way Apartment does, so their
// ColumnConfigEditor instances (components/AdminPage.tsx) pass
// allowCustomFields={false} — visibility/order/label are configurable,
// adding a brand-new custom field is not (there'd be nowhere to store its
// value).
export const DEFAULT_TENANT_COLUMNS: TableColumnConfig[] = [
  { key: "lagenhetsnummer", label: "Lägenhetsnummer", visible: true, isCustom: false },
  { key: "fastighet", label: "Fastighet", visible: true, isCustom: false },
  { key: "namn", label: "Namn", visible: true, isCustom: false },
  { key: "personnummer", label: "Personnummer", visible: true, isCustom: false },
  { key: "mejladress", label: "Mejladress", visible: true, isCustom: false },
  { key: "telefonnummer", label: "Telefonnummer", visible: true, isCustom: false },
];

export const DEFAULT_ANDRAHANDSGAST_COLUMNS: TableColumnConfig[] = [
  { key: "typ", label: "Boendeform", visible: true, isCustom: false },
  { key: "lagenhetsnummer", label: "Lägenhetsnummer", visible: true, isCustom: false },
  { key: "fastighet", label: "Fastighet", visible: true, isCustom: false },
  { key: "namn", label: "Namn", visible: true, isCustom: false },
  { key: "personnummer", label: "Personnummer", visible: true, isCustom: false },
  { key: "mejladress", label: "Mejladress", visible: true, isCustom: false },
  { key: "telefonnummer", label: "Telefonnummer", visible: true, isCustom: false },
];

export const DEFAULT_ARKIV_COLUMNS: TableColumnConfig[] = [
  { key: "lagenhetsnummer", label: "Lägenhetsnummer", visible: true, isCustom: false },
  { key: "fastighet", label: "Fastighet", visible: true, isCustom: false },
  { key: "storlek", label: "Storlek", visible: true, isCustom: false },
  { key: "objekttyp", label: "Objekttyp", visible: true, isCustom: false },
  { key: "antalRum", label: "Antal rum", visible: true, isCustom: false },
  { key: "ledigFrom", label: "Ledig fr.o.m.", visible: true, isCustom: false },
  { key: "arshyra", label: "Årshyra", visible: true, isCustom: false },
  { key: "hyresrabatt", label: "Hyresrabatt", visible: true, isCustom: false },
  { key: "hyresreduktion", label: "Hyresreduktion", visible: true, isCustom: false },
  { key: "arshyraMedRed", label: "Årshyra med red.", visible: true, isCustom: false },
  { key: "manadshyra", label: "Månadshyra", visible: true, isCustom: false },
  { key: "hyresgastNamn", label: "Hyresgäst namn", visible: true, isCustom: false },
  { key: "personnummer", label: "Personnummer", visible: true, isCustom: false },
  { key: "epost", label: "E-post", visible: true, isCustom: false },
  { key: "telefonnummer", label: "Telefonnummer", visible: true, isCustom: false },
  { key: "kontonummer", label: "Kontonummer", visible: true, isCustom: false },
  { key: "kontraktSkickatDatum", label: "Kontrakt skickat", visible: true, isCustom: false },
  { key: "kontraktSigneratDatum", label: "Kontrakt signerat", visible: true, isCustom: false },
];

export const DEFAULT_UPPSAGNING_COLUMNS: TableColumnConfig[] = [
  { key: "lagenhetsnummer", label: "Lägenhetsnummer", visible: true, isCustom: false },
  { key: "fastighet", label: "Fastighet", visible: true, isCustom: false },
  { key: "hyresgastNamn", label: "Hyresgäst", visible: true, isCustom: false },
  { key: "bekraftelsedatum", label: "Uppsägning bekräftad", visible: true, isCustom: false },
  { key: "flyttdatum", label: "Flyttdatum", visible: true, isCustom: false },
];

export const DEFAULT_TODO_COLUMNS: TableColumnConfig[] = [
  { key: "titel", label: "Uppgift", visible: true, isCustom: false },
  { key: "prioritet", label: "Prioritet", visible: true, isCustom: false },
  { key: "klarDatum", label: "Klart senast", visible: true, isCustom: false },
  { key: "tilldelad", label: "Tilldelad", visible: true, isCustom: false },
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

// No legacy layout to match — sequential columns A-J. No Fastighet column:
// it's derived from the lägenhetsnummer's prefix (see
// resolveFastighetFromPrefix) instead of read from the sheet. The interest
// fields (hyresgäst..kontonummer) default to "not present" (-1) since not
// every nation's sheet has them — an admin points them at real columns only
// if their kladd sheet already tracks an interested tenant per unit.
export const DEFAULT_APARTMENT_IMPORT: ImportMapping = {
  fields: [
    { field: "lagenhetsnummer", label: "Lägenhetsnummer", column: 0 },
    { field: "storlek", label: "Storlek", column: 1 },
    { field: "objekttyp", label: "Objekttyp", column: 2 },
    { field: "antalRum", label: "Antal rum", column: 3 },
    { field: "ledigFrom", label: "Ledig fr.o.m.", column: 4 },
    { field: "arshyra", label: "Årshyra", column: 5 },
    { field: "hyresrabatt", label: "Hyresrabatt", column: 6 },
    { field: "hyresreduktion", label: "Hyresreduktion", column: 7 },
    { field: "arshyraMedRed", label: "Årshyra med red.", column: 8 },
    { field: "manadshyra", label: "Månadshyra", column: 9 },
    { field: "hyresgastNamn", label: "Hyresgäst (intresserad)", column: -1 },
    { field: "personnummer", label: "Personnummer", column: -1 },
    { field: "epost", label: "E-post", column: -1 },
    { field: "telefonnummer", label: "Telefon", column: -1 },
    { field: "kontonummer", label: "Kontonummer", column: -1 },
  ],
};

// SheetJS's cellDates:true option reconstructs an Excel date cell as a JS
// Date using the LOCAL timezone's midnight for that calendar day, not UTC
// midnight — so it must be read back with local getters. Reading it with
// getUTCFullYear/Month/Date (an easy mistake) silently shifts the date back
// a day in any timezone ahead of UTC (e.g. Europe/Berlin in summer).
export function excelDateCellToISO(value: Date): string {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// docs/SAAS-READINESS-ROADMAP.md Tier 3.4 — was independently duplicated,
// byte-for-byte identical, in all 4 Excel-import dialogs
// (ExcelImportDialog.tsx, AndrahandsgastExcelImportDialog.tsx,
// BesiktningarExcelImportDialog.tsx, ApartmentExcelImport.tsx). Each
// importer's other cell helpers (cellNum/parseNumber, cellDate/
// formatDateCell) turned out NOT to be duplicates of each other on closer
// reading — besiktningar's date handling in particular has real,
// importer-specific logic (merged-cell inheritance, a YYMMDD-as-plain-number
// fallback) that a generic shared function would either lose or have to
// special-case — so only this one, genuinely-identical helper was
// consolidated; the others stay local to the importer that needs their
// specific behavior.
export function cellStr(row: unknown[], index: number): string {
  const val = (row as Record<number, unknown>)[index];
  return val == null ? "" : String(val).trim();
}

// Which fastighet a lägenhetsnummer belongs to, by longest matching
// registered prefix (so "NH" beats a hypothetical "N" on the same nation).
// Returns null when no fastighet's prefix matches — the caller should skip
// the row rather than guess.
export function resolveFastighetFromPrefix(
  lagenhetsnummer: string,
  fastigheter: Array<{ namn: string; prefixes: string[] }>
): string | null {
  const upper = lagenhetsnummer.trim().toUpperCase();
  let best: { namn: string; prefix: string } | null = null;
  for (const f of fastigheter) {
    for (const prefix of f.prefixes) {
      const p = prefix.trim().toUpperCase();
      if (p && upper.startsWith(p) && (!best || p.length > best.prefix.length)) {
        best = { namn: f.namn, prefix: p };
      }
    }
  }
  return best?.namn ?? null;
}

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

// Today's known raw spreadsheet spellings for LND's fastigheter, pointed at
// the actual registered names — the seed a nation with no saved aliases
// gets, so nothing changes until an admin edits it.
export const DEFAULT_FASTIGHET_ALIASES: FastighetAlias[] = [
  { alias: "arkivet", fastighet: "Arkivet" },
  { alias: "sankt thomas 35", fastighet: "Sankt Thomas 35" },
  { alias: "sankt thomas 39 b", fastighet: "Sankt Thomas 39 B" },
  { alias: "sankt thomas 39", fastighet: "Sankt Thomas 39" },
];

export function resolveFastighetAliases(
  defaults: FastighetAlias[],
  saved: FastighetAlias[] | undefined
): FastighetAlias[] {
  return saved ?? defaults;
}

// Runs a raw "Fastighet" cell through the admin-configured alias table
// (trimmed, case-insensitive match) — an unmatched value passes through
// unchanged so the caller can still try matching it directly.
export function applyFastighetAlias(raw: string, aliases: FastighetAlias[]): string {
  const trimmed = raw.trim();
  const match = aliases.find((a) => a.alias.trim().toLowerCase() === trimmed.toLowerCase());
  return match ? match.fastighet.trim() : trimmed;
}

// Alias, then a trimmed case-insensitive match against the nation's actual
// registered fastigheter — returns the registry's own casing so imported
// rows always store the canonical name, or null if nothing matches at all.
export function resolveFastighetName(
  raw: string,
  fastigheter: string[],
  aliases: FastighetAlias[]
): string | null {
  const candidate = applyFastighetAlias(raw, aliases);
  if (!candidate) return null;
  return fastigheter.find((f) => f.toLowerCase() === candidate.toLowerCase()) ?? null;
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
