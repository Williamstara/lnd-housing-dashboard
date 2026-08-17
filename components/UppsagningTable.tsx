"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo, useState } from "react";
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
import { confirmUppsagningAction } from "@/app/uppsagning/actions";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import type { Uppsagning } from "@/lib/uppsagningar";
import type { Tenant } from "@/lib/tenants";
import ColumnVisibilityMenu from "@/components/ColumnVisibilityMenu";
import ConfirmUppsagningDialog from "@/components/ConfirmUppsagningDialog";
import { ROLES, hasRole, normalizeRoles } from "@/lib/roles";
import type { TableColumnConfig } from "@/lib/table-columns";
import { useColumnVisibility } from "@/lib/use-column-visibility";

type Props = {
  uppsagningar: Uppsagning[];
  tenants: Tenant[];
  columnSettings: TableColumnConfig[];
};

type ColumnKey =
  | "lagenhetsnummer"
  | "fastighet"
  | "hyresgastNamn"
  | "bekraftelsedatum"
  | "flyttdatum";

type Order = "asc" | "desc";

function matchesSearch(u: Uppsagning, query: string): boolean {
  if (!query) return true;
  return [u.lagenhetsnummer, u.fastighet, u.hyresgastNamn]
    .join(" ")
    .toLocaleLowerCase("sv")
    .includes(query);
}

export default function UppsagningTable({ uppsagningar, tenants, columnSettings }: Props) {
  const { sessionClaims } = useAuth();
  const roles = normalizeRoles(sessionClaims?.roles);
  const isEkonomi = hasRole(roles, ROLES.EKONOMI);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColumnKey>("bekraftelsedatum");
  const [order, setOrder] = useState<Order>("desc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { isVisible, toggle } = useColumnVisibility("uppsagning");
  const nationColumns = useMemo(() => columnSettings.filter((c) => c.visible), [columnSettings]);
  const visibleColumnDefs = nationColumns.filter((c) => isVisible(c.key));
  // "dokument" is a document-download button, not a real Uppsagning field —
  // a per-user-only toggle appended just for the visibility menu, never
  // part of the admin-configurable column list.
  const toggleableColumns = [...nationColumns, { key: "dokument", label: "Dokument", visible: true, isCustom: false }];
  const showDokument = isVisible("dokument");

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

  async function handleConfirm(lagenhetsnummer: string, flyttdatum: string, dokument: File) {
    await confirmUppsagningAction(lagenhetsnummer, flyttdatum, dokument);
  }

  function handleExport() {
    exportRowsToXlsx(
      `uppsagning-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [...nationColumns.map((c) => c.label), "Bekräftad av"],
      visible.map((u) => [...nationColumns.map((c) => u[c.key as ColumnKey]), u.bekraftadAv])
    );
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}
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
        label="Sök"
        placeholder="Sök..."
        value={search}
        onChange={(event) => { setSearch(event.target.value); setPage(0); }}
        size="small"
        sx={{ mb: 2, maxWidth: 360 }}
        fullWidth
      />

      <Box sx={{ display: { xs: "none", sm: "block" } }}>
      <TableContainer component={Paper}>
        <Table aria-label="Uppsägningar">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <ColumnVisibilityMenu columns={toggleableColumns} isVisible={isVisible} onToggle={toggle} />
              </TableCell>
              {visibleColumnDefs.map((column) => (
                <TableCell
                  key={column.key}
                  sortDirection={orderBy === column.key ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === column.key}
                    direction={orderBy === column.key ? order : "asc"}
                    onClick={() => handleSort(column.key as ColumnKey)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              {showDokument && <TableCell>Dokument</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnDefs.length + (showDokument ? 1 : 0) + 1} align="center">
                  {uppsagningar.length === 0
                    ? "Inga uppsägningar registrerade än."
                    : "Inga träffar."}
                </TableCell>
              </TableRow>
            ) : (
              visible.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((u) => (
                <TableRow key={u.id}>
                  <TableCell padding="checkbox" />
                  {visibleColumnDefs.map((column) => (
                    <TableCell key={column.key}>
                      {(column.key as ColumnKey) === "bekraftelsedatum" ? (
                        <>
                          {u.bekraftelsedatum}
                          {u.bekraftadAv && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              av {u.bekraftadAv}
                            </Typography>
                          )}
                        </>
                      ) : (
                        u[column.key as ColumnKey]
                      )}
                    </TableCell>
                  ))}
                  {showDokument && (
                    <TableCell>
                      {u.dokumentFilnamn && (
                        <Button
                          size="small"
                          href={`/api/uppsagningar/${u.id}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {u.dokumentFilnamn}
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>

      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 1 }}>
          <ColumnVisibilityMenu columns={toggleableColumns} isVisible={isVisible} onToggle={toggle} />
        </Stack>
        {visible.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            {uppsagningar.length === 0 ? "Inga uppsägningar registrerade än." : "Inga träffar."}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {visible.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((u) => (
              <Card key={u.id} variant="outlined">
                <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 1 }}>
                    {visibleColumnDefs.map((column) => (
                      <Box key={column.key} sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {column.label}
                        </Typography>
                        <Box sx={{ overflowWrap: "break-word" }}>
                          {(column.key as ColumnKey) === "bekraftelsedatum" ? (
                            <>
                              {u.bekraftelsedatum}
                              {u.bekraftadAv && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  av {u.bekraftadAv}
                                </Typography>
                              )}
                            </>
                          ) : (
                            u[column.key as ColumnKey]
                          )}
                        </Box>
                      </Box>
                    ))}
                    {showDokument && u.dokumentFilnamn && (
                      <Box sx={{ gridColumn: "1 / -1" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          Dokument
                        </Typography>
                        <Button
                          size="small"
                          href={`/api/uppsagningar/${u.id}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ pl: 0 }}
                        >
                          {u.dokumentFilnamn}
                        </Button>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

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
