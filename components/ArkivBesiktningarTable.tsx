"use client";

import { useMemo, useState } from "react";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import type { Besiktning } from "@/lib/besiktningar";

type Props = {
  besiktningar: Besiktning[];
};

type ColumnKey =
  | "besiktningsdatum"
  | "lagenhetsnummer"
  | "kostnadStadning"
  | "vaktmastareAnteckning"
  | "godkand"
  | "husformanAnteckning"
  | "totaltAvdrag"
  | "klarForBetalningDatum"
  | "betalningGjordDatum";

type Order = "asc" | "desc";

const columns: Array<{ key: ColumnKey; label: string; align?: "right" }> = [
  { key: "besiktningsdatum", label: "Besiktningsdatum" },
  { key: "lagenhetsnummer", label: "Lägenhetsnummer" },
  { key: "kostnadStadning", label: "Kostnad städning", align: "right" },
  { key: "vaktmastareAnteckning", label: "Vaktmästare anteckning" },
  { key: "godkand", label: "Godkänd?" },
  { key: "husformanAnteckning", label: "Husförman anteckning" },
  { key: "totaltAvdrag", label: "Totalt avdrag", align: "right" },
  { key: "klarForBetalningDatum", label: "Klar för betalning" },
  { key: "betalningGjordDatum", label: "Betalning gjord" },
];

function godkandLabel(godkand: boolean | null): string {
  if (godkand === true) return "Ja";
  if (godkand === false) return "Nej";
  return "—";
}

const columnValue: Record<ColumnKey, (b: Besiktning) => string | number> = {
  besiktningsdatum: (b) => b.besiktningsdatum,
  lagenhetsnummer: (b) => b.lagenhetsnummer,
  kostnadStadning: (b) => b.kostnadStadning,
  vaktmastareAnteckning: (b) => b.vaktmastareAnteckning,
  godkand: (b) => godkandLabel(b.godkand),
  husformanAnteckning: (b) => b.husformanAnteckning,
  totaltAvdrag: (b) => b.totaltAvdrag,
  klarForBetalningDatum: (b) => b.klarForBetalningDatum ?? "",
  betalningGjordDatum: (b) => b.betalningGjordDatum ?? "",
};

const currency = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "sv", { sensitivity: "base" });
}

function matchesSearch(row: Besiktning, query: string): boolean {
  if (!query) return true;
  return [row.lagenhetsnummer, row.vaktmastareAnteckning, row.husformanAnteckning]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("sv")
    .includes(query);
}

export default function ArkivBesiktningarTable({ besiktningar }: Props) {
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColumnKey>("besiktningsdatum");
  const [order, setOrder] = useState<Order>("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sv");
    const filtered = besiktningar.filter((b) => matchesSearch(b, query));
    const direction = order === "asc" ? 1 : -1;
    const getValue = columnValue[orderBy];
    return filtered.sort((a, b) => direction * compareValues(getValue(a), getValue(b)));
  }, [besiktningar, search, orderBy, order]);

  function handleSort(column: ColumnKey) {
    if (orderBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(column);
      setOrder("asc");
    }
    setPage(0);
  }

  function handleExport() {
    exportRowsToXlsx(
      `besiktningar-arkiv-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [...columns.map((c) => c.label), "Klar för betalning av", "Betalning gjord av"],
      visibleRows.map((row) => [
        ...columns.map((c) => columnValue[c.key](row)),
        row.klarForBetalningAv ?? "",
        row.betalningGjordAv ?? "",
      ])
    );
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, mt: 6, gap: 2 }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Arkiverade besiktningar
        </Typography>
        <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport}>
          Exportera
        </Button>
      </Stack>

      <TextField
        placeholder="Sök i arkiverade besiktningar..."
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        size="small"
        sx={{ mb: 2, maxWidth: 360 }}
        fullWidth
      />

      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table aria-label="Arkiverade besiktningar" size="small">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align}
                  sortDirection={orderBy === column.key ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === column.key}
                    direction={orderBy === column.key ? order : "asc"}
                    onClick={() => handleSort(column.key)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  {besiktningar.length === 0
                    ? "Inga arkiverade besiktningar ännu."
                    : "Inga träffar."}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.besiktningsdatum}</TableCell>
                    <TableCell>{row.lagenhetsnummer}</TableCell>
                    <TableCell align="right">{currency.format(row.kostnadStadning)}</TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: "normal" }}>
                      {row.vaktmastareAnteckning}
                    </TableCell>
                    <TableCell>{godkandLabel(row.godkand)}</TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: "normal" }}>
                      {row.husformanAnteckning}
                    </TableCell>
                    <TableCell align="right">{currency.format(row.totaltAvdrag)}</TableCell>
                    <TableCell>
                      {row.klarForBetalningDatum}
                      {row.klarForBetalningAv && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          av {row.klarForBetalningAv}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.betalningGjordDatum}
                      {row.betalningGjordAv && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          av {row.betalningGjordAv}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={visibleRows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Rader per sida:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} av ${count}`}
      />
    </>
  );
}
