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
import { importAndrahandsgasterFromExcelAction } from "@/app/hyresgastlista/actions";
import type { AndrahandsgastInput } from "@/lib/andrahandsgaster";
import {
  describeMapping,
  mappingToLookup,
  resolveFastighetName,
  type FastighetAlias,
  type ImportFieldConfig,
} from "@/lib/table-columns";

function cellStr(row: unknown[], index: number): string {
  const val = (row as Record<number, unknown>)[index];
  return val == null ? "" : String(val).trim();
}

function parseRows(
  data: ArrayBuffer,
  fastigheter: string[],
  aliases: FastighetAlias[],
  col: Record<string, number>
): { rows: AndrahandsgastInput[]; skipped: number } {
  const wb = read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  let skipped = 0;
  const rows: AndrahandsgastInput[] = [];

  for (const row of raw) {
    const fastighetsRaw = cellStr(row as unknown[], col.fastighet!);
    const lagenhetsnummer = cellStr(row as unknown[], col.lagenhetsnummer!);
    const namn = cellStr(row as unknown[], col.namn!);
    const personnummer = cellStr(row as unknown[], col.personnummer!);
    const mejladress = cellStr(row as unknown[], col.mejladress!);
    const telefonnummer = cellStr(row as unknown[], col.telefonnummer!);

    if (!namn || !lagenhetsnummer) {
      skipped++;
      continue;
    }

    const fastighet = resolveFastighetName(fastighetsRaw, fastigheter, aliases);
    if (!fastighet) {
      skipped++;
      continue;
    }

    rows.push({ lagenhetsnummer, fastighet, namn, personnummer, mejladress, telefonnummer });
  }

  return { rows, skipped };
}

type Props = {
  open: boolean;
  fastigheter: string[];
  aliases: FastighetAlias[];
  mapping: ImportFieldConfig[];
  onClose: () => void;
};

type Stage = "pick" | "preview" | "done";

export default function AndrahandsgastExcelImportDialog({
  open,
  fastigheter,
  aliases,
  mapping,
  onClose,
}: Props) {
  const col = useMemo(() => mappingToLookup({ fields: mapping }), [mapping]);
  const description = useMemo(() => describeMapping({ fields: mapping }), [mapping]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<Stage>("pick");
  const [rows, setRows] = useState<AndrahandsgastInput[]>([]);
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
        const { rows: parsed, skipped: sk } = parseRows(
          ev.target!.result as ArrayBuffer,
          fastigheter,
          aliases,
          col
        );
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
        const res = await importAndrahandsgasterFromExcelAction(rows);
        setResult(res);
        setStage("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Importera andrahandsgäster från Excel</DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {stage === "pick" && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, py: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Välj en xlsx-fil. Kolumn {description}.
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
              Befintliga andrahandsgäster med samma lägenhetsnummer uppdateras. Nya läggs till.
            </Typography>
            <TableContainer sx={{ maxHeight: 360 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Lgh-nr</TableCell>
                    <TableCell>Fastighet</TableCell>
                    <TableCell>Namn</TableCell>
                    <TableCell>Personnummer</TableCell>
                    <TableCell>E-post</TableCell>
                    <TableCell>Telefon</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.lagenhetsnummer}</TableCell>
                      <TableCell>{row.fastighet}</TableCell>
                      <TableCell>{row.namn}</TableCell>
                      <TableCell>{row.personnummer}</TableCell>
                      <TableCell>{row.mejladress}</TableCell>
                      <TableCell>{row.telefonnummer}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}

        {stage === "done" && result && (
          <Alert severity="success">
            Import klar — {result.inserted} nya andrahandsgäster tillagda,{" "}
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
