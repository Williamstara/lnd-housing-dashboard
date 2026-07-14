"use client";

import { useUser } from "@auth0/nextjs-auth0";
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
import { confirmUppsagningAction } from "@/app/uppsagning/actions";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import type { Uppsagning } from "@/lib/uppsagningar";
import type { Tenant } from "@/lib/tenants";
import ConfirmUppsagningDialog from "@/components/ConfirmUppsagningDialog";
import { ROLES, hasRole } from "@/lib/roles";

type Props = {
  uppsagningar: Uppsagning[];
  tenants: Tenant[];
};

type ColumnKey =
  | "lagenhetsnummer"
  | "fastighet"
  | "hyresgastNamn"
  | "bekraftelsedatum"
  | "flyttdatum";

type Order = "asc" | "desc";

const columns: Array<{ key: ColumnKey; label: string }> = [
  { key: "lagenhetsnummer", label: "Lägenhetsnummer" },
  { key: "fastighet", label: "Fastighet" },
  { key: "hyresgastNamn", label: "Hyresgäst" },
  { key: "bekraftelsedatum", label: "Uppsägning bekräftad" },
  { key: "flyttdatum", label: "Flyttdatum" },
];

function matchesSearch(u: Uppsagning, query: string): boolean {
  if (!query) return true;
  return [u.lagenhetsnummer, u.fastighet, u.hyresgastNamn]
    .join(" ")
    .toLocaleLowerCase("sv")
    .includes(query);
}

export default function UppsagningTable({ uppsagningar, tenants }: Props) {
  const { user } = useUser();
  const isEkonomi = hasRole(user, ROLES.EKONOMI);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColumnKey>("bekraftelsedatum");
  const [order, setOrder] = useState<Order>("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const visible = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sv");
    const filtered = uppsagningar.filter((u) => matchesSearch(u, query));
    const direction = order === "asc" ? 1 : -1;
    return filtered.sort(
      (a, b) =>
        direction * a[orderBy].localeCompare(b[orderBy], "sv", { sensitivity: "base" })
    );
  }, [uppsagningar, search, orderBy, order]);

  function handleSort(column: ColumnKey) {
    if (orderBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(column);
      setOrder("asc");
    }
    setPage(0);
  }

  async function handleConfirm(lagenhetsnummer: string, flyttdatum: string) {
    await confirmUppsagningAction(lagenhetsnummer, flyttdatum);
  }

  function handleExport() {
    exportRowsToXlsx(
      `uppsagning-${new Date().toISOString().slice(0, 10)}.xlsx`,
      columns.map((c) => c.label),
      visible.map((u) => columns.map((c) => u[c.key]))
    );
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Uppsägning
        </Typography>
        <Stack direction="row" sx={{ gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
          >
            Exportera
          </Button>
          {isEkonomi && (
            <Button variant="contained" onClick={() => setConfirmOpen(true)}>
              Bekräfta uppsägning
            </Button>
          )}
        </Stack>
      </Stack>

      <TextField
        placeholder="Sök..."
        value={search}
        onChange={(event) => { setSearch(event.target.value); setPage(0); }}
        size="small"
        sx={{ mb: 2, maxWidth: 360 }}
        fullWidth
      />

      <TableContainer component={Paper}>
        <Table aria-label="Uppsägningar">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
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
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  {uppsagningar.length === 0
                    ? "Inga uppsägningar registrerade än."
                    : "Inga träffar."}
                </TableCell>
              </TableRow>
            ) : (
              visible.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.lagenhetsnummer}</TableCell>
                  <TableCell>{u.fastighet}</TableCell>
                  <TableCell>{u.hyresgastNamn}</TableCell>
                  <TableCell>{u.bekraftelsedatum}</TableCell>
                  <TableCell>{u.flyttdatum}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={visible.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Rader per sida:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} av ${count}`}
      />

      <ConfirmUppsagningDialog
        open={confirmOpen}
        tenants={tenants}
        onClose={() => setConfirmOpen(false)}
        onSubmit={handleConfirm}
      />
    </>
  );
}
