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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { read, utils } from "xlsx";
import { importBesiktningarFromExcelAction } from "@/app/besiktningar/actions";
import type { BesiktningImportInput } from "@/lib/besiktningar";
import { describeMapping, excelDateCellToISO, mappingToLookup, type ImportFieldConfig } from "@/lib/table-columns";

function cellStr(row: unknown[], index: number): string {
  const val = (row as Record<number, unknown>)[index];
  return val == null ? "" : String(val).trim();
}

function godkandLabel(godkand: boolean | null): string {
  if (godkand === true) return "Ja";
  if (godkand === false) return "Nej";
  return "—";
}

function parseGodkand(raw: string): boolean | null {
  const v = raw.trim().toLocaleLowerCase("sv");
  if (v === "ja" || v === "true" || v === "x") return true;
  if (v === "nej" || v === "false") return false;
  return null;
}

function parseNumber(raw: string): number {
  if (!raw) return 0;
  const n = Number(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// Excel merges the date cell down over every apartment row for that date,
// so only the first row of each group has a value in column A — the rest
// need to inherit the most recently seen date.
function formatDateCell(value: unknown): string {
  if (value instanceof Date) return excelDateCellToISO(value);
  const str = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  // Cell holds a plain "YYMMDD" number/text (e.g. 260601), not an Excel date
  // serial — 46000-ish is a real serial, 260601 is just the digits as typed.
  if (/^\d{5,6}$/.test(str)) {
    const padded = str.padStart(6, "0");
    const yy = padded.slice(0, 2);
    const mm = padded.slice(2, 4);
    const dd = padded.slice(4, 6);
    return `20${yy}-${mm}-${dd}`;
  }
  return str;
}

function parseRows(
  data: ArrayBuffer,
  col: Record<string, number>
): { rows: BesiktningImportInput[]; skipped: number } {
  const wb = read(data, { type: "array", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  let skipped = 0;
  const rows: BesiktningImportInput[] = [];
  let currentDate = "";

  for (const row of raw) {
    const lagenhetsnummer = cellStr(row, col.lagenhetsnummer!);
    const dateCellRaw = cellStr(row, col.besiktningsdatum!).toLocaleLowerCase("sv");
    if (lagenhetsnummer.toLocaleLowerCase("sv") === "lägenhetsnummer" || dateCellRaw === "datum") {
      continue; // header row
    }

    const dateCell = (row as Record<number, unknown>)[col.besiktningsdatum!];
    if (dateCell !== "" && dateCell != null) {
      currentDate = formatDateCell(dateCell);
    }

    if (!lagenhetsnummer) continue; // blank spacer row

    if (!currentDate) {
      skipped++;
      continue;
    }

    rows.push({
      besiktningsdatum: currentDate,
      lagenhetsnummer,
      kostnadStadning: parseNumber(cellStr(row, col.kostnadStadning!)),
      vaktmastareAnteckning: cellStr(row, col.vaktmastareAnteckning!),
      godkand: parseGodkand(cellStr(row, col.godkand!)),
      husformanAnteckning: cellStr(row, col.husformanAnteckning!),
      totaltAvdrag: parseNumber(cellStr(row, col.totaltAvdrag!)),
    });
  }

  return { rows, skipped };
}

type Props = {
  open: boolean;
  mapping: ImportFieldConfig[];
  onClose: () => void;
};

type Stage = "pick" | "preview" | "done";

export default function BesiktningarExcelImportDialog({ open, mapping, onClose }: Props) {
  const col = useMemo(() => mappingToLookup({ fields: mapping }), [mapping]);
  const description = useMemo(() => describeMapping({ fields: mapping }), [mapping]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [rows, setRows] = useState<BesiktningImportInput[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [result, setResult] = useState<{ inserted: number; updated: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setStage("pick");
    setRows([]);
    setSkipped(0);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const { rows: parsed, skipped: sk } = parseRows(ev.target!.result as ArrayBuffer, col);
        if (parsed.length === 0) {
          setError(`Inga giltiga rader hittades i filen. Kontrollera kolumnerna: ${description}.`);
          return;
        }
        setRows(parsed);
        setSkipped(sk);
        setStage("preview");
      } catch {
        setError("Kunde inte läsa filen. Kontrollera att det är en giltig xlsx-fil.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await importBesiktningarFromExcelAction(rows);
        setResult(res);
        setStage("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Ladda upp från Excel</DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {stage === "pick" && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Välj en xlsx-fil strukturerad som tabellen: kolumn {description}. Besiktningsdatum
              kan stå på första raden för varje datumgrupp, resten lämnas tomma.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => fileRef.current?.click()}
            >
              Välj fil
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </Box>
        )}

        {stage === "preview" && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
              <Chip label={`${rows.length} rader att importera`} color="primary" size="small" />
              {skipped > 0 && (
                <Chip label={`${skipped} rader hoppades över`} color="warning" size="small" />
              )}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Befintliga besiktningar med samma lägenhetsnummer och besiktningsdatum uppdateras.
              Nya läggs till.
            </Typography>
            <TableContainer sx={{ maxHeight: 360 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Besiktningsdatum</TableCell>
                    <TableCell>Lgh-nr</TableCell>
                    <TableCell align="right">Kostnad städ</TableCell>
                    <TableCell>Kommentar vaktmästare</TableCell>
                    <TableCell>Godkänd?</TableCell>
                    <TableCell>Husförman kommentar</TableCell>
                    <TableCell align="right">Totalt avdrag</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.besiktningsdatum}</TableCell>
                      <TableCell>{row.lagenhetsnummer}</TableCell>
                      <TableCell align="right">{row.kostnadStadning}</TableCell>
                      <TableCell>{row.vaktmastareAnteckning}</TableCell>
                      <TableCell>{godkandLabel(row.godkand)}</TableCell>
                      <TableCell>{row.husformanAnteckning}</TableCell>
                      <TableCell align="right">{row.totaltAvdrag}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {stage === "done" && result && (
          <Alert severity="success">
            Import klar — {result.inserted} nya besiktningar tillagda,{" "}
            {result.updated} befintliga uppdaterade.
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
                  {isPending ? "Importerar…" : `Importera ${rows.length} rader`}
                </Button>
              </>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
