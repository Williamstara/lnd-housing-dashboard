"use client";

import { useMemo, useState, useTransition } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import SearchIcon from "@mui/icons-material/Search";
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
  createRentalObjectAction,
  deleteRentalObjectAction,
  updateRentalObjectAction,
} from "@/app/databas/actions";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import type { RentalObject, RentalObjectInput } from "@/lib/rentalobjects";
import RentalObjectExcelImport from "@/components/RentalObjectExcelImport";
import RentalObjectFormDialog from "@/components/RentalObjectFormDialog";

type Props = { objects: RentalObject[]; fastigheter: string[] };

type ColKey =
  | "lagenhetsnummer"
  | "fastighet"
  | "typ"
  | "area"
  | "areaInkKorr"
  | "malbildshyra"
  | "renoveringsbehov"
  | "hyresrabatt"
  | "hyresred"
  | "individuellArshyra"
  | "manadshyra";

type Order = "asc" | "desc";

const columns: Array<{ key: ColKey; label: string; align?: "right" }> = [
  { key: "lagenhetsnummer", label: "Lägenhetsnummer" },
  { key: "fastighet", label: "Fastighet" },
  { key: "typ", label: "Typ" },
  { key: "area", label: "Area (m²)", align: "right" },
  { key: "areaInkKorr", label: "Ink korr", align: "right" },
  { key: "malbildshyra", label: "Målbildshyra", align: "right" },
  { key: "renoveringsbehov", label: "Renov", align: "right" },
  { key: "hyresrabatt", label: "Hyresrabatt", align: "right" },
  { key: "hyresred", label: "Hyresred", align: "right" },
  { key: "individuellArshyra", label: "Individuell år", align: "right" },
  { key: "manadshyra", label: "Månadshyra", align: "right" },
];

const colValue: Record<ColKey, (o: RentalObject) => string | number> = {
  lagenhetsnummer: (o) => o.lagenhetsnummer,
  fastighet: (o) => o.fastighet,
  typ: (o) => o.typ ?? "",
  area: (o) => o.area ?? 0,
  areaInkKorr: (o) => o.areaInkKorr ?? 0,
  malbildshyra: (o) => o.malbildshyra ?? 0,
  renoveringsbehov: (o) => o.renoveringsbehov ?? 0,
  hyresrabatt: (o) => o.hyresrabatt ?? 0,
  hyresred: (o) => o.hyresred ?? 0,
  individuellArshyra: (o) => o.individuellArshyra ?? 0,
  manadshyra: (o) => o.manadshyra ?? 0,
};

function compare(a: string | number, b: string | number) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "sv", { sensitivity: "base" });
}

function matchesSearch(o: RentalObject, q: string): boolean {
  if (!q) return true;
  return [o.lagenhetsnummer, o.fastighet, o.typ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("sv")
    .includes(q);
}

const currency = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

function fmtNum(v: number | null): string {
  return v != null ? currency.format(v) : "—";
}

export default function RentalObjectsTable({ objects, fastigheter }: Props) {
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColKey>("lagenhetsnummer");
  const [order, setOrder] = useState<Order>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<RentalObject | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingLabel, setDeletingLabel] = useState("");
  const [isDeleting, startDeleteTransition] = useTransition();

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("sv");
    const filtered = objects.filter((o) => matchesSearch(o, q));
    const dir = order === "asc" ? 1 : -1;
    const get = colValue[orderBy];
    return filtered.sort((a, b) => dir * compare(get(a), get(b)));
  }, [objects, search, orderBy, order]);

  function handleSort(col: ColKey) {
    if (orderBy === col) setOrder((p) => (p === "asc" ? "desc" : "asc"));
    else { setOrderBy(col); setOrder("asc"); }
    setPage(0);
  }

  function openCreate() {
    setEditingObject(null);
    setDialogKey((k) => k + 1);
    setFormOpen(true);
  }

  function openEdit(obj: RentalObject) {
    setEditingObject(obj);
    setDialogKey((k) => k + 1);
    setFormOpen(true);
  }

  async function handleFormSubmit(input: RentalObjectInput) {
    if (editingObject) {
      await updateRentalObjectAction(editingObject.id, input);
    } else {
      await createRentalObjectAction(input);
    }
  }

  function confirmDelete() {
    if (!deletingId) return;
    const id = deletingId;
    startDeleteTransition(async () => {
      await deleteRentalObjectAction(id);
      setDeletingId(null);
    });
  }

  function handleExport() {
    exportRowsToXlsx(
      `databas-${new Date().toISOString().slice(0, 10)}.xlsx`,
      columns.map((c) => c.label),
      visible.map((o) => columns.map((c) => colValue[c.key](o)))
    );
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Databas
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
            Importera från Excel
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Lägg till objekt
          </Button>
        </Stack>
      </Stack>

      <TextField
        placeholder="Sök objekt..."
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(0); }}
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

      <TableContainer component={Paper}>
        <Table
          size="small"
          aria-label="Databas"
          sx={{ "& .MuiTableCell-root": { px: 1.25, py: 0.75, fontSize: "0.8125rem" } }}
        >
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  align={col.align}
                  sortDirection={orderBy === col.key ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === col.key}
                    direction={orderBy === col.key ? order : "asc"}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right">Åtgärder</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  {objects.length === 0
                    ? "Inga hyresobjekt. Importera från Excel för att komma igång."
                    : "Inga träffar."}
                </TableCell>
              </TableRow>
            ) : (
              visible
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.lagenhetsnummer}</TableCell>
                    <TableCell>{o.fastighet}</TableCell>
                    <TableCell>{o.typ || "—"}</TableCell>
                    <TableCell align="right">{o.area ?? "—"}</TableCell>
                    <TableCell align="right">{o.areaInkKorr ?? "—"}</TableCell>
                    <TableCell align="right">{fmtNum(o.malbildshyra)}</TableCell>
                    <TableCell align="right">{o.renoveringsbehov ?? "—"}</TableCell>
                    <TableCell align="right">{fmtNum(o.hyresrabatt)}</TableCell>
                    <TableCell align="right">{fmtNum(o.hyresred)}</TableCell>
                    <TableCell align="right">{fmtNum(o.individuellArshyra)}</TableCell>
                    <TableCell align="right">{fmtNum(o.manadshyra)}</TableCell>
                    <TableCell align="right">
                      <IconButton
                        aria-label="Redigera"
                        size="small"
                        onClick={() => openEdit(o)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="Ta bort"
                        size="small"
                        onClick={() => {
                          setDeletingId(o.id);
                          setDeletingLabel(o.lagenhetsnummer);
                        }}
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
      <TablePagination
        component="div"
        count={visible.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Rader per sida:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} av ${count}`}
      />

      <RentalObjectFormDialog
        key={dialogKey}
        open={formOpen}
        object={editingObject}
        fastigheter={fastigheter}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <RentalObjectExcelImport open={importOpen} onClose={() => setImportOpen(false)} />

      <Dialog open={!!deletingId} onClose={() => setDeletingId(null)}>
        <DialogTitle>Ta bort objekt</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Är du säker på att du vill ta bort {deletingLabel}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingId(null)} disabled={isDeleting}>Avbryt</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={isDeleting}>
            Ta bort
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
