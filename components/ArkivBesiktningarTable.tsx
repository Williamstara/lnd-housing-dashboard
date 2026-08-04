"use client";

import { useMemo, useState, type ReactNode } from "react";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
import ColumnVisibilityMenu from "@/components/ColumnVisibilityMenu";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import type { Besiktning } from "@/lib/besiktningar";
import { useColumnVisibility } from "@/lib/use-column-visibility";

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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { isVisible, toggle } = useColumnVisibility("arkiv-besiktningar");
  const visibleColumnDefs = columns.filter((c) => isVisible(c.key));

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

  function renderCellValue(row: Besiktning, key: ColumnKey): ReactNode {
    if (key === "kostnadStadning" || key === "totaltAvdrag") {
      return currency.format(row[key]);
    }
    if (key === "klarForBetalningDatum") {
      return (
        <>
          {row.klarForBetalningDatum}
          {row.klarForBetalningAv && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              av {row.klarForBetalningAv}
            </Typography>
          )}
        </>
      );
    }
    if (key === "betalningGjordDatum") {
      return (
        <>
          {row.betalningGjordDatum}
          {row.betalningGjordAv && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              av {row.betalningGjordAv}
            </Typography>
          )}
        </>
      );
    }
    return columnValue[key](row);
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
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, mt: 6, gap: 2, flexWrap: "wrap" }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Arkiverade besiktningar
        </Typography>
        <Stack direction="row" sx={{ gap: 1 }}>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport}>
            Exportera
          </Button>
        </Stack>
      </Stack>

      <TextField
        label="Sök"
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

      <Box sx={{ display: { xs: "none", sm: "block" } }}>
      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table aria-label="Arkiverade besiktningar" size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <ColumnVisibilityMenu columns={columns} isVisible={isVisible} onToggle={toggle} />
              </TableCell>
              {visibleColumnDefs.map((column) => (
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
                <TableCell colSpan={visibleColumnDefs.length + 1} align="center">
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
                    <TableCell padding="checkbox" />
                    {visibleColumnDefs.map((column) => (
                      <TableCell
                        key={column.key}
                        align={column.align}
                        sx={
                          column.key === "vaktmastareAnteckning" || column.key === "husformanAnteckning"
                            ? { maxWidth: 200, whiteSpace: "normal" }
                            : undefined
                        }
                      >
                        {renderCellValue(row, column.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>

      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 1 }}>
          <ColumnVisibilityMenu columns={columns} isVisible={isVisible} onToggle={toggle} />
        </Stack>
        {visibleRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            {besiktningar.length === 0 ? "Inga arkiverade besiktningar ännu." : "Inga träffar."}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {visibleRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
              <Card key={row.id} variant="outlined">
                <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 1 }}>
                    {visibleColumnDefs.map((column) => (
                      <Box
                        key={column.key}
                        sx={{
                          minWidth: 0,
                          gridColumn:
                            column.key === "vaktmastareAnteckning" || column.key === "husformanAnteckning"
                              ? "1 / -1"
                              : undefined,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {column.label}
                        </Typography>
                        <Box sx={{ overflowWrap: "break-word" }}>{renderCellValue(row, column.key)}</Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

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
