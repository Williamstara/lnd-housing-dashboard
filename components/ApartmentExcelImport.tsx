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
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Typography from "@mui/material/Typography";
import { read, utils } from "xlsx";
import { importApartmentsFromExcelAction } from "@/app/lediga-lagenheter/actions";
import type { ApartmentImportInput } from "@/lib/apartments";
import ResponsivePreview from "@/components/ResponsivePreview";
import {
  cellStr,
  describeMapping,
  excelDateCellToISO,
  mappingToLookup,
  resolveFastighetFromPrefix,
  type ImportFieldConfig,
} from "@/lib/table-columns";

type FastighetPrefixes = { namn: string; prefixes: string[] };

function cellNum(row: unknown[], index: number): number {
  const val = (row as Record<number, unknown>)[index];
  if (typeof val === "number") return val;
  const n = Number(String(val ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// cellDates:true turns a real Excel date into a Date object; a plain
// "YYYY-MM-DD" string (or already-typed text) passes through as-is.
function cellDate(row: unknown[], index: number): string {
  const val = (row as Record<number, unknown>)[index];
  if (val instanceof Date) return excelDateCellToISO(val);
  return String(val ?? "").trim();
}

type SkippedRow = { lagenhetsnummer: string; reason: string };

function parseRows(
  data: ArrayBuffer,
  sheetName: string,
  fastigheter: FastighetPrefixes[],
  col: Record<string, number>
): { rows: ApartmentImportInput[]; skippedDetails: SkippedRow[]; blankRows: number } {
  const wb = read(data, { type: "array", cellDates: true });
  const ws = wb.Sheets[sheetName];
  const raw = utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  let blankRows = 0;
  const skippedDetails: SkippedRow[] = [];
  const rows: ApartmentImportInput[] = [];

  for (const row of raw) {
    const lagenhetsnummer = cellStr(row, col.lagenhetsnummer!);
    const storlek = cellStr(row, col.storlek!);
    const objekttyp = cellStr(row, col.objekttyp!);
    const ledigFrom = cellDate(row, col.ledigFrom!);

    if (!lagenhetsnummer && !storlek && !objekttyp && !ledigFrom) {
      blankRows++;
      continue;
    }
    if (!lagenhetsnummer) {
      skippedDetails.push({ lagenhetsnummer: "(saknas)", reason: "Saknar lägenhetsnummer" });
      continue;
    }
    if (!storlek) {
      skippedDetails.push({ lagenhetsnummer, reason: "Saknar storlek" });
      continue;
    }
    if (!objekttyp) {
      skippedDetails.push({ lagenhetsnummer, reason: "Saknar objekttyp" });
      continue;
    }
    if (!ledigFrom) {
      skippedDetails.push({ lagenhetsnummer, reason: 'Saknar "ledig fr.o.m."' });
      continue;
    }

    const fastighet = resolveFastighetFromPrefix(lagenhetsnummer, fastigheter);
    if (!fastighet) {
      skippedDetails.push({
        lagenhetsnummer,
        reason: "Inget prefix under Fastigheter matchar lägenhetsnumret",
      });
      continue;
    }

    rows.push({
      lagenhetsnummer,
      fastighet,
      storlek,
      objekttyp,
      ledigFrom,
      antalRum: cellNum(row, col.antalRum!),
      arshyra: cellNum(row, col.arshyra!),
      // Sheets commonly store a reduction as a negative amount — normalize
      // to a magnitude, same convention as the rentalobjects importer.
      hyresrabatt: Math.abs(cellNum(row, col.hyresrabatt!)),
      hyresreduktion: Math.abs(cellNum(row, col.hyresreduktion!)),
      arshyraMedRed: cellNum(row, col.arshyraMedRed!),
      manadshyra: cellNum(row, col.manadshyra!),
      hyresgastNamn: cellStr(row, col.hyresgastNamn!) || undefined,
      personnummer: cellStr(row, col.personnummer!) || undefined,
      epost: cellStr(row, col.epost!) || undefined,
      telefonnummer: cellStr(row, col.telefonnummer!) || undefined,
      kontonummer: cellStr(row, col.kontonummer!) || undefined,
    });
  }

  return { rows, skippedDetails, blankRows };
}

type Props = {
  open: boolean;
  fastigheter: FastighetPrefixes[];
  mapping: ImportFieldConfig[];
  onClose: () => void;
};

type Stage = "pick" | "choose-sheet" | "preview" | "done";

const currency = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

export default function ApartmentExcelImport({ open, fastigheter, mapping, onClose }: Props) {
  const col = useMemo(() => mappingToLookup({ fields: mapping }), [mapping]);
  const description = useMemo(() => describeMapping({ fields: mapping }), [mapping]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [workbookData, setWorkbookData] = useState<ArrayBuffer | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [rows, setRows] = useState<ApartmentImportInput[]>([]);
  const [skippedDetails, setSkippedDetails] = useState<SkippedRow[]>([]);
  const [blankRows, setBlankRows] = useState(0);
  const [showSkipped, setShowSkipped] = useState(false);
  const [result, setResult] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
    skippedDetails: SkippedRow[];
  } | null>(null);
  const [showResultSkipped, setShowResultSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setStage("pick");
    setWorkbookData(null);
    setSheetNames([]);
    setSelectedSheet("");
    setRows([]);
    setSkippedDetails([]);
    setBlankRows(0);
    setShowSkipped(false);
    setResult(null);
    setShowResultSkipped(false);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function runParse(data: ArrayBuffer, sheetName: string) {
    try {
      const { rows: parsed, skippedDetails: details, blankRows: blanks } = parseRows(
        data,
        sheetName,
        fastigheter,
        col
      );
      if (parsed.length === 0) {
        setError(`Inga giltiga rader hittades i "${sheetName}". Kontrollera kolumnerna: ${description}.`);
        return;
      }
      setRows(parsed);
      setSkippedDetails(details);
      setBlankRows(blanks);
      setStage("preview");
    } catch {
      setError("Kunde inte läsa filen. Kontrollera att det är en giltig xlsx-fil.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const data = ev.target!.result as ArrayBuffer;
      let names: string[];
      try {
        names = read(data, { type: "array", bookSheets: true }).SheetNames;
      } catch {
        setError("Kunde inte läsa filen. Kontrollera att det är en giltig xlsx-fil.");
        return;
      }
      if (names.length > 1) {
        setWorkbookData(data);
        setSheetNames(names);
        setSelectedSheet(names[0]!);
        setStage("choose-sheet");
        return;
      }
      runParse(data, names[0]!);
    };
    reader.readAsArrayBuffer(file);
  }

  function handleSheetConfirm() {
    if (!workbookData || !selectedSheet) return;
    setError(null);
    runParse(workbookData, selectedSheet);
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await importApartmentsFromExcelAction(rows);
        setResult(res);
        setStage("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle>Importera lediga lägenheter från Excel</DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {stage === "pick" && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Välj en xlsx-fil. Kolumn {description}.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fastighet läses inte från en kolumn — den bestäms av lägenhetsnumrets prefix, inställt
              per fastighet under Fastigheter.
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

        {stage === "choose-sheet" && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Filen har flera flikar. Välj vilken som ska läsas in.
            </Typography>
            <Select
              size="small"
              value={selectedSheet}
              onChange={(e) => setSelectedSheet(e.target.value)}
              sx={{ minWidth: 240 }}
            >
              {sheetNames.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}

        {stage === "preview" && (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
              <Chip label={`${rows.length} rader att importera`} color="primary" size="small" />
              {skippedDetails.length > 0 && (
                <Chip
                  label={`${skippedDetails.length} rader hoppades över`}
                  color="warning"
                  size="small"
                  onClick={() => setShowSkipped((v) => !v)}
                  clickable
                />
              )}
              {blankRows > 0 && (
                <Chip label={`${blankRows} helt tomma rader (ignorerade)`} size="small" variant="outlined" />
              )}
            </Box>
            {showSkipped && skippedDetails.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <ResponsivePreview
                  ariaLabel="Överhoppade lägenhetsrader"
                  rows={skippedDetails}
                  columns={[
                    { key: "lagenhetsnummer", label: "Lgh-nr", render: (row) => row.lagenhetsnummer },
                    { key: "reason", label: "Anledning", render: (row) => row.reason },
                  ]}
                />
              </Box>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Befintliga (icke arkiverade) lägenheter med samma lägenhetsnummer uppdateras. Nya läggs
              till som lediga.
            </Typography>
            <ResponsivePreview
              ariaLabel="Förhandsgranskning av lediga lägenheter"
              rows={rows}
              columns={[
                { key: "lagenhetsnummer", label: "Lgh-nr", render: (row) => row.lagenhetsnummer },
                { key: "fastighet", label: "Fastighet", render: (row) => row.fastighet },
                { key: "storlek", label: "Storlek", render: (row) => row.storlek },
                { key: "typ", label: "Typ", render: (row) => row.objekttyp },
                { key: "rum", label: "Rum", align: "right", render: (row) => row.antalRum },
                { key: "ledigFrom", label: "Ledig fr.o.m.", render: (row) => row.ledigFrom },
                { key: "arshyra", label: "Årshyra", align: "right", render: (row) => currency.format(row.arshyra) },
                { key: "manadshyra", label: "Månadshyra", align: "right", render: (row) => currency.format(row.manadshyra) },
                { key: "hyresgast", label: "Hyresgäst", render: (row) => row.hyresgastNamn ?? "—" },
              ]}
            />
          </>
        )}

        {stage === "done" && result && (
          <>
            <Alert severity="success" sx={{ mb: result.skipped > 0 ? 1.5 : 0 }}>
              Import klar — {result.inserted} nya lägenheter tillagda, {result.updated} befintliga
              uppdaterade{result.skipped > 0 ? `, ${result.skipped} rader ogiltiga och överhoppade` : ""}.
            </Alert>
            {result.skipped > 0 && (
              <>
                <Chip
                  label={`Visa ${result.skipped} överhoppade rader`}
                  color="warning"
                  size="small"
                  onClick={() => setShowResultSkipped((v) => !v)}
                  clickable
                  sx={{ mb: 1.5 }}
                />
                {showResultSkipped && (
                  <ResponsivePreview
                    ariaLabel="Servervaliderade överhoppade lägenhetsrader"
                    rows={result.skippedDetails}
                    columns={[
                      { key: "lagenhetsnummer", label: "Lgh-nr", render: (row) => row.lagenhetsnummer },
                      { key: "reason", label: "Anledning", render: (row) => row.reason },
                    ]}
                  />
                )}
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        {stage === "done" ? (
          <Button onClick={handleClose} variant="contained">Stäng</Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={isPending}>Avbryt</Button>
            {stage === "choose-sheet" && (
              <>
                <Button onClick={reset}>Välj annan fil</Button>
                <Button onClick={handleSheetConfirm} variant="contained">Läs in flik</Button>
              </>
            )}
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
