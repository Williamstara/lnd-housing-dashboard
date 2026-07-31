"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { read, utils } from "xlsx";
import { importRentalObjectsAction } from "@/app/databas/actions";
import type { RentalObjectInput } from "@/lib/rentalobjects";
import {
  describeMapping,
  mappingToLookup,
  type ImportFieldConfig,
  type RentalObjectTabGroup,
} from "@/lib/table-columns";

// ─── helpers ────────────────────────────────────────────────────────────────

const FASTIGHET_MAP: Record<string, string> = {
  "arkivet": "Arkivet (223 59, Lund)",
  "sankt thomas 35": "Gamla huset (223 51, Lund)",
  "sankt thomas 39 b": "Finn huset (223 51, Lund)",
  "sankt thomas 39": "Nya huset (223 51, Lund)",
};

function mapFastighet(raw: string): string {
  return FASTIGHET_MAP[raw.trim().toLowerCase()] ?? raw.trim();
}

function str(row: unknown[], col: number): string {
  const v = (row as Record<number, unknown>)[col];
  return v == null ? "" : String(v).trim();
}

function num(row: unknown[], col: number): number | null {
  const v = (row as Record<number, unknown>)[col];
  if (v == null || v === "") return null;
  const n =
    typeof v === "number"
      ? v
      : parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return isNaN(n) ? null : n;
}

function renovToRabatt(renov: number | null, malbild: number | null): number | null {
  if (renov == null || malbild == null) return null;
  const pct = renov === 2 ? 0.02 : renov === 3 ? 0.04 : renov === 4 ? 0.08 : 0;
  return Math.round(malbild * pct);
}

// Any row without a valid renoveringsbehov (missing column, blank cell, or
// something outside 1-4) defaults to 1 ("OK") — applies across every tab,
// not just Arkivet, so imports never leave the field silently empty.
function normalizeRenoveringsbehov(renov: number | null): number {
  return renov != null && [1, 2, 3, 4].includes(renov) ? renov : 1;
}

// ─── tab detection ───────────────────────────────────────────────────────────

// First group (in admin-defined order) whose matchers include a substring of
// the sheet name — replaces the old hardcoded GH/NH/Finn/Arkivet regex logic
// with something an admin can fully redefine per nation.
function detectGroup(sheetName: string, groups: RentalObjectTabGroup[]): RentalObjectTabGroup | null {
  const lower = sheetName.trim().toLowerCase();
  for (const group of groups) {
    if (group.matchers.some((m) => m.trim() && lower.includes(m.trim().toLowerCase()))) {
      return group;
    }
  }
  return null;
}

// ─── generic sheet parser ────────────────────────────────────────────────────

// One parser for both standard (single-sheet) and multi-tab mode. A column
// of -1 ("not present on this sheet") makes str()/num() read past the end of
// the row and come back empty/null, so fields a nation's layout doesn't have
// (e.g. Finn huset's missing renoveringsbehov) just come out null — no
// special-casing needed per tab.
function parseSheet(rows: unknown[][], prefix: string, col: Record<string, number>): RentalObjectInput[] {
  const out: RentalObjectInput[] = [];
  for (const row of rows) {
    const lgh = str(row, col.lagenhetsnummer!);
    if (!lgh || !/\d/.test(lgh)) continue; // only rows that actually have a lägenhetsnummer
    const malbild = num(row, col.malbildshyra!);
    const renov = num(row, col.renoveringsbehov!);
    // hyresrabatt column = amount from Excel; fall back to calculation
    const rabattRaw = num(row, col.hyresrabatt!);
    const hyresrabatt = rabattRaw != null ? Math.abs(rabattRaw) : renovToRabatt(renov, malbild);
    const hyresred = num(row, col.hyresred!);
    const hyresredAbs = hyresred != null ? Math.abs(hyresred) : null;
    const individuell =
      malbild != null
        ? (malbild - (hyresrabatt ?? 0)) - (hyresredAbs ?? 0)
        : null;
    out.push({
      fastighet: mapFastighet(str(row, col.fastighet!)),
      lagenhetsnummer: prefix + lgh,
      area: num(row, col.area!),
      areaInkKorr: num(row, col.areaInkKorr!),
      typ: str(row, col.typ!),
      malbildshyra: malbild,
      renoveringsbehov: normalizeRenoveringsbehov(renov),
      hyresrabatt,
      hyresred: hyresredAbs,
      individuellArshyra: individuell,
      manadshyra: individuell != null ? Math.round(individuell / 12) : null,
      planritning: null,
    });
  }
  return out;
}

// ─── main parser ─────────────────────────────────────────────────────────────

type ParseResult = {
  rows: RentalObjectInput[];
  tabSummary: Array<{ name: string; count: number }>;
  skippedTabs: string[];
};

// Standard mode (default): everything on one sheet — reads only the first
// sheet, no fliknamn detection required. Multi-tab mode (opt-in per nation)
// routes each sheet to whichever admin-defined tab group matches its name.
function parseWorkbook(
  data: ArrayBuffer,
  singleFields: ImportFieldConfig[],
  multiTab: boolean,
  tabGroups: RentalObjectTabGroup[]
): ParseResult {
  const wb = read(data, { type: "array" });
  const rows: RentalObjectInput[] = [];
  const tabSummary: Array<{ name: string; count: number }> = [];
  const skippedTabs: string[] = [];

  if (!multiTab) {
    const [sheetName, ...restSheets] = wb.SheetNames;
    if (sheetName) {
      const ws = wb.Sheets[sheetName];
      const raw = utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
      const parsedRows = parseSheet(raw, "", mappingToLookup({ fields: singleFields }));
      rows.push(...parsedRows);
      tabSummary.push({ name: sheetName, count: parsedRows.length });
    }
    skippedTabs.push(...restSheets);
    return { rows, tabSummary, skippedTabs };
  }

  for (const sheetName of wb.SheetNames) {
    const group = detectGroup(sheetName, tabGroups);
    if (!group) {
      skippedTabs.push(sheetName);
      continue;
    }
    const ws = wb.Sheets[sheetName];
    const raw = utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
    const parsed = parseSheet(raw, group.prefix, mappingToLookup({ fields: group.fields }));
    rows.push(...parsed);
    tabSummary.push({ name: sheetName, count: parsed.length });
  }

  return { rows, tabSummary, skippedTabs };
}

// ─── component ───────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  singleFields: ImportFieldConfig[];
  multiTab: boolean;
  tabGroups: RentalObjectTabGroup[];
  onClose: () => void;
};
type Stage = "pick" | "preview" | "done";

export default function RentalObjectExcelImport({
  open,
  singleFields,
  multiTab,
  tabGroups,
  onClose,
}: Props) {
  const description = useMemo(() => {
    if (!multiTab) return describeMapping({ fields: singleFields });
    return tabGroups.map((g) => `${g.name}: ${describeMapping({ fields: g.fields })}`).join(" · ");
  }, [singleFields, multiTab, tabGroups]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [result, setResult] = useState<{ inserted: number; updated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setStage("pick");
    setParsed(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const result = parseWorkbook(ev.target!.result as ArrayBuffer, singleFields, multiTab, tabGroups);
        if (result.rows.length === 0) {
          setError(
            multiTab
              ? `Inga giltiga rader hittades. Kontrollera att filens fliknamn matchar: ${tabGroups.map((g) => g.name).join(", ")}.`
              : `Inga giltiga rader hittades. Kontrollera kolumnerna: ${description}.`
          );
          return;
        }
        setParsed(result);
        setStage("preview");
      } catch {
        setError("Kunde inte läsa filen. Kontrollera att det är en giltig xlsx-fil.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleConfirm() {
    if (!parsed) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await importRentalObjectsAction(parsed.rows);
        setResult(res);
        setStage("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  const currency = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle>Importera hyresobjekt från Excel</DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {stage === "pick" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {multiTab
                ? `Välj en xlsx-fil med flikarna: ${tabGroups.map((g) => g.name).join(", ")}.`
                : "Välj en xlsx-fil. All information läses från det första bladet."}
              {" "}Befintliga objekt med samma lägenhetsnummer uppdateras.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {multiTab ? `Kolumner per flik — ${description}.` : `Kolumn ${description}.`}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => fileRef.current?.click()}
              sx={{ alignSelf: "flex-start" }}
            >
              Välj fil
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFile}
            />
          </Box>
        )}

        {stage === "preview" && parsed && (
          <>
            <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mb: 2 }}>
              <Chip
                label={`${parsed.rows.length} objekt totalt`}
                color="primary"
                size="small"
              />
              {parsed.tabSummary.map((t) => (
                <Chip
                  key={t.name}
                  label={`${t.name}: ${t.count}`}
                  size="small"
                  variant="outlined"
                />
              ))}
              {parsed.skippedTabs.length > 0 && (
                <Chip
                  label={`Ignorerade flikar: ${parsed.skippedTabs.join(", ")}`}
                  color="warning"
                  size="small"
                />
              )}
            </Stack>

            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Lgh-nr</TableCell>
                    <TableCell>Fastighet</TableCell>
                    <TableCell>Typ</TableCell>
                    <TableCell align="right">Area</TableCell>
                    <TableCell align="right">Ink korr</TableCell>
                    <TableCell align="right">Målbild</TableCell>
                    <TableCell align="right">Renov</TableCell>
                    <TableCell align="right">Rabatt</TableCell>
                    <TableCell align="right">Hyresred</TableCell>
                    <TableCell align="right">Individuell</TableCell>
                    <TableCell align="right">Månad</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {parsed.rows.slice(0, 200).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.lagenhetsnummer}</TableCell>
                      <TableCell>{r.fastighet}</TableCell>
                      <TableCell>{r.typ}</TableCell>
                      <TableCell align="right">{r.area ?? "—"}</TableCell>
                      <TableCell align="right">{r.areaInkKorr ?? "—"}</TableCell>
                      <TableCell align="right">
                        {r.malbildshyra != null ? currency.format(r.malbildshyra) : "—"}
                      </TableCell>
                      <TableCell align="right">{r.renoveringsbehov ?? "—"}</TableCell>
                      <TableCell align="right">
                        {r.hyresrabatt != null ? currency.format(r.hyresrabatt) : "—"}
                      </TableCell>
                      <TableCell align="right">
                        {r.hyresred != null ? currency.format(r.hyresred) : "—"}
                      </TableCell>
                      <TableCell align="right">
                        {r.individuellArshyra != null ? currency.format(r.individuellArshyra) : "—"}
                      </TableCell>
                      <TableCell align="right">
                        {r.manadshyra != null ? currency.format(r.manadshyra) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {parsed.rows.length > 200 && (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ color: "text.secondary" }}>
                        … och {parsed.rows.length - 200} till
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {stage === "done" && result && (
          <Alert severity="success">
            Import klar — {result.inserted} nya objekt tillagda, {result.updated} befintliga uppdaterade.
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        {stage === "done" ? (
          <Button onClick={handleClose} variant="contained">Stäng</Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={isPending}>Avbryt</Button>
            {stage === "preview" && (
              <>
                <Button onClick={reset} disabled={isPending}>Välj annan fil</Button>
                <Button onClick={handleConfirm} variant="contained" disabled={isPending}>
                  {isPending ? "Importerar…" : `Importera ${parsed?.rows.length} objekt`}
                </Button>
              </>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
