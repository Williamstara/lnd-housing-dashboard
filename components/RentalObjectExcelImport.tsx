"use client";

import { useRef, useState, useTransition } from "react";
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

// ─── tab detection ───────────────────────────────────────────────────────────

type TabType = "GH" | "NH" | "FH" | "ArkivetB" | "ArkivetC" | "ArkivetD";

function detectTab(name: string): TabType | null {
  const n = name.trim().toLowerCase();
  if (n.includes("finn")) return "FH";
  if (n.includes("gh") || n.includes("st35") || n.includes("st 35")) return "GH";
  if (n.includes("nh") || n.includes("st39") || n.includes("st 39")) return "NH";
  if (n.includes("arkivet")) {
    if (/ b$| b |^b$/i.test(" " + n) || n.endsWith(" b")) return "ArkivetB";
    if (/ c$| c |^c$/i.test(" " + n) || n.endsWith(" c")) return "ArkivetC";
    if (/ d$| d |^d$/i.test(" " + n) || n.endsWith(" d")) return "ArkivetD";
    // fallback: check last non-space char
    const last = n.replace(/\s+$/, "").slice(-1);
    if (last === "b") return "ArkivetB";
    if (last === "c") return "ArkivetC";
    if (last === "d") return "ArkivetD";
  }
  return null;
}

// ─── per-tab parsers ─────────────────────────────────────────────────────────

function parseGHNH(rows: unknown[][], prefix: "GH" | "NH"): RentalObjectInput[] {
  const out: RentalObjectInput[] = [];
  for (const row of rows) {
    const lgh = str(row, 1);
    if (!lgh || isNaN(Number(lgh))) continue; // skip header / empty
    const malbild = num(row, 5);
    const renov = num(row, 9);
    // K (col 10) = hyresrabatt amount from Excel; fall back to calculation
    const rabattRaw = num(row, 10);
    const hyresrabatt = rabattRaw != null ? Math.abs(rabattRaw) : renovToRabatt(renov, malbild);
    const hyresred = num(row, 11);
    const hyresredAbs = hyresred != null ? Math.abs(hyresred) : null;
    const individuell =
      malbild != null
        ? (malbild - (hyresrabatt ?? 0)) - (hyresredAbs ?? 0)
        : null;
    out.push({
      fastighet: mapFastighet(str(row, 0)),
      lagenhetsnummer: prefix + lgh,
      area: num(row, 2),
      areaInkKorr: num(row, 3),
      typ: str(row, 4),
      malbildshyra: malbild,
      renoveringsbehov: renov,
      hyresrabatt,
      hyresred: hyresredAbs,
      individuellArshyra: individuell,
      manadshyra: individuell != null ? Math.round(individuell / 12) : null,
      planritning: null,
    });
  }
  return out;
}

function parseFinn(rows: unknown[][]): RentalObjectInput[] {
  const out: RentalObjectInput[] = [];
  for (const row of rows) {
    const lgh = str(row, 1);
    if (!lgh || isNaN(Number(lgh))) continue;
    const malbild = num(row, 3);
    const individuell = malbild;
    out.push({
      fastighet: mapFastighet(str(row, 0)),
      lagenhetsnummer: "FH" + lgh,
      area: num(row, 6),
      areaInkKorr: null,
      typ: str(row, 8),
      malbildshyra: malbild,
      renoveringsbehov: null,
      hyresrabatt: null,
      hyresred: null,
      individuellArshyra: individuell,
      manadshyra: individuell != null ? Math.round(individuell / 12) : null,
      planritning: null,
    });
  }
  return out;
}

function parseArkivet(rows: unknown[][], suffix: "B" | "C" | "D"): RentalObjectInput[] {
  const out: RentalObjectInput[] = [];
  for (const row of rows) {
    const lgh = str(row, 1);
    if (!lgh || isNaN(Number(lgh))) continue;
    const malbild = num(row, 6);
    const renov = num(row, 11);
    const rabattRaw = num(row, 12);
    const hyresrabatt = rabattRaw != null ? Math.abs(rabattRaw) : renovToRabatt(renov, malbild);
    const individuell = malbild != null ? malbild - (hyresrabatt ?? 0) : null;
    out.push({
      fastighet: mapFastighet(str(row, 0)),
      lagenhetsnummer: suffix + lgh,
      area: num(row, 2),
      areaInkKorr: null,
      typ: str(row, 4),
      malbildshyra: malbild,
      renoveringsbehov: renov,
      hyresrabatt,
      hyresred: null,
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

function parseWorkbook(data: ArrayBuffer): ParseResult {
  const wb = read(data, { type: "array" });
  const rows: RentalObjectInput[] = [];
  const tabSummary: Array<{ name: string; count: number }> = [];
  const skippedTabs: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const tabType = detectTab(sheetName);
    if (!tabType) {
      skippedTabs.push(sheetName);
      continue;
    }
    const ws = wb.Sheets[sheetName];
    const raw = utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

    let parsed: RentalObjectInput[];
    if (tabType === "GH") parsed = parseGHNH(raw, "GH");
    else if (tabType === "NH") parsed = parseGHNH(raw, "NH");
    else if (tabType === "FH") parsed = parseFinn(raw);
    else if (tabType === "ArkivetB") parsed = parseArkivet(raw, "B");
    else if (tabType === "ArkivetC") parsed = parseArkivet(raw, "C");
    else parsed = parseArkivet(raw, "D");

    rows.push(...parsed);
    tabSummary.push({ name: sheetName, count: parsed.length });
  }

  return { rows, tabSummary, skippedTabs };
}

// ─── component ───────────────────────────────────────────────────────────────

type Props = { open: boolean; onClose: () => void };
type Stage = "pick" | "preview" | "done";

export default function RentalObjectExcelImport({ open, onClose }: Props) {
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
        const result = parseWorkbook(ev.target!.result as ArrayBuffer);
        if (result.rows.length === 0) {
          setError(
            "Inga giltiga rader hittades. Kontrollera att filens fliknamn matchar GH ST35, NH ST39, Finn huset eller Arkivet B/C/D."
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
              Välj en xlsx-fil med flikarna GH ST35, NH ST39, Finn huset och/eller Arkivet B/C/D.
              Befintliga objekt med samma lägenhetsnummer uppdateras.
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
