"use client";

import { useMemo, useState, useTransition } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import LocalLaundryServiceIcon from "@mui/icons-material/LocalLaundryService";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
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
import {
  createAndrahandsgastAction,
  deleteAndrahandsgastAction,
  updateAndrahandsgastAction,
} from "@/app/hyresgastlista/actions";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import type { Andrahandsgast, AndrahandsgastInput } from "@/lib/andrahandsgaster";
import type { ImportFieldConfig } from "@/lib/table-columns";
import AndrahandsgastExcelImportDialog from "@/components/AndrahandsgastExcelImportDialog";
import AndrahandsgastFormDialog from "@/components/AndrahandsgastFormDialog";
import AndrahandsgastLaundryAccountDialog from "@/components/AndrahandsgastLaundryAccountDialog";
import ColumnVisibilityMenu from "@/components/ColumnVisibilityMenu";
import { useColumnVisibility } from "@/lib/use-column-visibility";

type Props = {
  andrahandsgaster: Andrahandsgast[];
  fastigheter: string[];
  importMapping: ImportFieldConfig[];
};

type SortableColumn = Exclude<keyof Andrahandsgast, "id">;
type Order = "asc" | "desc";

const columns: Array<{ key: SortableColumn; label: string }> = [
  { key: "lagenhetsnummer", label: "Lägenhetsnummer" },
  { key: "fastighet", label: "Fastighet" },
  { key: "namn", label: "Namn" },
  { key: "personnummer", label: "Personnummer" },
  { key: "mejladress", label: "Mejladress" },
  { key: "telefonnummer", label: "Telefonnummer" },
];

function matchesSearch(row: Andrahandsgast, query: string): boolean {
  if (!query) return true;
  const haystack = [row.lagenhetsnummer, row.fastighet, row.namn, row.personnummer, row.mejladress, row.telefonnummer]
    .join(" ")
    .toLocaleLowerCase("sv");
  return haystack.includes(query);
}

export default function AndrahandsgasterTable({ andrahandsgaster, fastigheter, importMapping }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<Andrahandsgast | null>(null);
  const [deletingRow, setDeletingRow] = useState<Andrahandsgast | null>(null);
  const [laundryRow, setLaundryRow] = useState<Andrahandsgast | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  // Bumped on every open so AndrahandsgastFormDialog remounts with fresh form
  // state instead of syncing props via an effect.
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<SortableColumn>("lagenhetsnummer");
  const [order, setOrder] = useState<Order>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const { isVisible, toggle } = useColumnVisibility("andrahandsgaster");
  const visibleColumnDefs = columns.filter((c) => isVisible(c.key));

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sv");
    const filtered = andrahandsgaster.filter((row) => matchesSearch(row, query));
    const direction = order === "asc" ? 1 : -1;
    return filtered.sort(
      (a, b) => direction * a[orderBy].localeCompare(b[orderBy], "sv", { sensitivity: "base" })
    );
  }, [andrahandsgaster, search, orderBy, order]);

  function handleSort(column: SortableColumn) {
    if (orderBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(column);
      setOrder("asc");
    }
    setPage(0);
  }

  function openCreateDialog() {
    setEditingRow(null);
    setDialogKey((key) => key + 1);
    setFormOpen(true);
  }

  function openEditDialog(row: Andrahandsgast) {
    setEditingRow(row);
    setDialogKey((key) => key + 1);
    setFormOpen(true);
  }

  async function handleFormSubmit(input: AndrahandsgastInput) {
    if (editingRow) {
      await updateAndrahandsgastAction(editingRow.id, input);
    } else {
      await createAndrahandsgastAction(input);
    }
  }

  function confirmDelete() {
    if (!deletingRow) return;
    const id = deletingRow.id;
    startDeleteTransition(async () => {
      await deleteAndrahandsgastAction(id);
      setDeletingRow(null);
    });
  }

  function handleExport() {
    exportRowsToXlsx(
      `andrahandsgaster-${new Date().toISOString().slice(0, 10)}.xlsx`,
      columns.map((c) => c.label),
      visibleRows.map((row) => columns.map((c) => row[c.key]))
    );
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, mt: 6, gap: 2, flexWrap: "wrap" }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Andrahandsgäster / inneboende
        </Typography>
        <Stack direction="row" sx={{ gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
          >
            Exportera
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen(true)}
          >
            Lägg till från Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
          >
            Lägg till andrahandsgäst
          </Button>
        </Stack>
      </Stack>

      <TextField
        placeholder="Sök andrahandsgäster..."
        value={search}
        onChange={(event) => { setSearch(event.target.value); setPage(0); }}
        size="small"
        sx={{ mb: 2, maxWidth: 360 }}
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      <Box sx={{ display: { xs: "none", sm: "block" } }}>
      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table
          aria-label="Andrahandsgäster"
          size="small"
          sx={{
            minWidth: 900,
            "& .MuiTableCell-root": { px: 1.25, py: 0.75, fontSize: "0.8125rem", whiteSpace: "nowrap" },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <ColumnVisibilityMenu columns={columns} isVisible={isVisible} onToggle={toggle} />
              </TableCell>
              {visibleColumnDefs.map((column) => (
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
              <TableCell align="right">Åtgärder</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnDefs.length + 2} align="center">
                  {andrahandsgaster.length === 0
                    ? "Inga andrahandsgäster hittades."
                    : "Inga träffar för sökningen."}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
                <TableRow key={row.id}>
                  <TableCell padding="checkbox" />
                  {visibleColumnDefs.map((column) => (
                    <TableCell key={column.key}>{row[column.key]}</TableCell>
                  ))}
                  <TableCell align="right">
                    <IconButton
                      aria-label="Skapa tvättstugekonto"
                      size="small"
                      onClick={() => setLaundryRow(row)}
                      title="Skapa tvättstugekonto"
                    >
                      <LocalLaundryServiceIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="Redigera"
                      size="small"
                      onClick={() => openEditDialog(row)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="Ta bort"
                      size="small"
                      onClick={() => setDeletingRow(row)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
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
            {andrahandsgaster.length === 0 ? "Inga andrahandsgäster hittades." : "Inga träffar för sökningen."}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {visibleRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => (
              <Card key={row.id} variant="outlined">
                <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" sx={{ justifyContent: "flex-end", gap: 0.5, mb: 1 }}>
                    <IconButton
                      aria-label="Skapa tvättstugekonto"
                      size="small"
                      onClick={() => setLaundryRow(row)}
                      title="Skapa tvättstugekonto"
                    >
                      <LocalLaundryServiceIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label="Redigera" size="small" onClick={() => openEditDialog(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label="Ta bort" size="small" onClick={() => setDeletingRow(row)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 1 }}>
                    {visibleColumnDefs.map((column) => (
                      <Box key={column.key} sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {column.label}
                        </Typography>
                        <Box sx={{ overflowWrap: "break-word" }}>{row[column.key]}</Box>
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

      <AndrahandsgastExcelImportDialog
        open={importOpen}
        fastigheter={fastigheter}
        mapping={importMapping}
        onClose={() => setImportOpen(false)}
      />

      <AndrahandsgastLaundryAccountDialog
        andrahandsgast={laundryRow}
        onClose={() => setLaundryRow(null)}
      />

      <AndrahandsgastFormDialog
        key={dialogKey}
        open={formOpen}
        andrahandsgast={editingRow}
        fastigheter={fastigheter}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <Dialog open={!!deletingRow} onClose={() => setDeletingRow(null)}>
        <DialogTitle>Ta bort andrahandsgäst</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Är du säker på att du vill ta bort {deletingRow?.namn}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingRow(null)} disabled={isDeleting}>
            Avbryt
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            Ta bort
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
