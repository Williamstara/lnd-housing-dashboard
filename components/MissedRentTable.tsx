"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
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
  createManualMissedRentAction,
  deleteMissedRentAction,
  updateMissedRentAction,
} from "@/app/statistik/actions";
import type { Apartment } from "@/lib/apartments";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import type { MissedRentRow } from "@/lib/missed-rent";
import { ROLES, hasRole } from "@/lib/roles";

type Props = {
  rows: MissedRentRow[];
  availableApartments: Apartment[];
};

type ColumnKey =
  | "lagenhetsnummer"
  | "ledigFrom"
  | "faktisktInflyttDatum"
  | "arshyra"
  | "hyresrabatt"
  | "hyresreduktion"
  | "arshyraMedRed"
  | "manadshyra"
  | "missadIntakt"
  | "ovrigaMissadeKostnader"
  | "totalMissat"
  | "kommentar"
  | "ansvarig";

type Order = "asc" | "desc";

const columns: Array<{ key: ColumnKey; label: string; align?: "right" }> = [
  { key: "lagenhetsnummer", label: "Lägenhetsnummer" },
  { key: "ledigFrom", label: "Ledig fr.o.m." },
  { key: "faktisktInflyttDatum", label: "Faktiskt inflytt" },
  { key: "arshyra", label: "Årshyra", align: "right" },
  { key: "hyresrabatt", label: "Hyresrabatt", align: "right" },
  { key: "hyresreduktion", label: "Hyresreduktion", align: "right" },
  { key: "arshyraMedRed", label: "Individuell årshyra", align: "right" },
  { key: "manadshyra", label: "Månadshyra", align: "right" },
  { key: "missadIntakt", label: "Missad intäkt", align: "right" },
  { key: "ovrigaMissadeKostnader", label: "Övriga missade kostnader", align: "right" },
  { key: "totalMissat", label: "Totalt", align: "right" },
  { key: "kommentar", label: "Kommentar" },
  { key: "ansvarig", label: "Ansvarig" },
];

const columnValue: Record<ColumnKey, (r: MissedRentRow) => string | number> = {
  lagenhetsnummer: (r) => r.lagenhetsnummer,
  ledigFrom: (r) => r.ledigFrom,
  faktisktInflyttDatum: (r) => r.faktisktInflyttDatum ?? "",
  arshyra: (r) => r.arshyra,
  hyresrabatt: (r) => r.hyresrabatt,
  hyresreduktion: (r) => r.hyresreduktion,
  arshyraMedRed: (r) => r.arshyraMedRed,
  manadshyra: (r) => r.manadshyra,
  missadIntakt: (r) => r.missadIntakt,
  ovrigaMissadeKostnader: (r) => r.ovrigaMissadeKostnader,
  totalMissat: (r) => r.totalMissat,
  kommentar: (r) => r.kommentar,
  ansvarig: (r) => r.ansvarig,
};

const currency = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "sv", { sensitivity: "base" });
}

function matchesSearch(row: MissedRentRow, query: string): boolean {
  if (!query) return true;
  return [row.lagenhetsnummer, row.fastighet, row.kommentar, row.ansvarig]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("sv")
    .includes(query);
}

type EditForm = {
  faktisktInflyttDatum: string;
  ovrigaMissadeKostnader: string;
  kommentar: string;
  ansvarig: string;
};

export default function MissedRentTable({ rows, availableApartments }: Props) {
  const { user } = useUser();
  const isHusforman = hasRole(user, ROLES.HUSFORMAN);

  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColumnKey>("ledigFrom");
  const [order, setOrder] = useState<Order>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [editingRow, setEditingRow] = useState<MissedRentRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    faktisktInflyttDatum: "",
    ovrigaMissadeKostnader: "0",
    kommentar: "",
    ansvarig: "",
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const [deletingRow, setDeletingRow] = useState<MissedRentRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [addOpen, setAddOpen] = useState(false);
  const [addApartment, setAddApartment] = useState<Apartment | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, startAddTransition] = useTransition();

  const ansvarigOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.ansvarig).filter(Boolean))).sort(),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sv");
    const filtered = rows.filter((r) => matchesSearch(r, query));
    const direction = order === "asc" ? 1 : -1;
    const getValue = columnValue[orderBy];
    return filtered.sort(
      (a, b) => direction * compareValues(getValue(a), getValue(b))
    );
  }, [rows, search, orderBy, order]);

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
      `missade-hyror-${new Date().toISOString().slice(0, 10)}.xlsx`,
      columns.map((c) => c.label),
      visibleRows.map((row) =>
        columns.map((c) => {
          if (c.key === "faktisktInflyttDatum") return row.faktisktInflyttDatum ?? "";
          return columnValue[c.key](row);
        })
      )
    );
  }

  function openEdit(row: MissedRentRow) {
    setEditError(null);
    setEditingRow(row);
    setEditForm({
      faktisktInflyttDatum: row.faktisktInflyttDatum ?? "",
      ovrigaMissadeKostnader: String(row.ovrigaMissadeKostnader),
      kommentar: row.kommentar,
      ansvarig: row.ansvarig,
    });
  }

  function handleSave() {
    if (!editingRow) return;
    const id = editingRow.id;
    setEditError(null);
    startSaveTransition(async () => {
      try {
        await updateMissedRentAction(id, {
          faktisktInflyttDatum: editForm.faktisktInflyttDatum || null,
          ovrigaMissadeKostnader: Number(editForm.ovrigaMissadeKostnader) || 0,
          kommentar: editForm.kommentar.trim(),
          ansvarig: editForm.ansvarig.trim(),
        });
        setEditingRow(null);
      } catch {
        setEditError("Något gick fel. Försök igen.");
      }
    });
  }

  function confirmDelete() {
    if (!deletingRow) return;
    const id = deletingRow.id;
    startDeleteTransition(async () => {
      await deleteMissedRentAction(id);
      setDeletingRow(null);
    });
  }

  function openAdd() {
    setAddError(null);
    setAddApartment(null);
    setAddOpen(true);
  }

  function handleAdd() {
    if (!addApartment) return;
    setAddError(null);
    startAddTransition(async () => {
      try {
        await createManualMissedRentAction(addApartment.id);
        setAddOpen(false);
      } catch (err) {
        setAddError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Missade hyror
        </Typography>
        <Stack direction="row" sx={{ gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
          >
            Exportera
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Lägg till
          </Button>
        </Stack>
      </Stack>

      <TextField
        placeholder="Sök..."
        value={search}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        size="small"
        sx={{ mb: 2, maxWidth: 360 }}
        fullWidth
      />

      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table aria-label="Missade hyror" size="small">
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
              <TableCell align="right">Åtgärder</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  {rows.length === 0
                    ? "Inga missade hyror registrerade."
                    : "Inga träffar."}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.lagenhetsnummer}</TableCell>
                    <TableCell>{row.ledigFrom}</TableCell>
                    <TableCell>{row.faktisktInflyttDatum ?? "Pågående"}</TableCell>
                    <TableCell align="right">{currency.format(row.arshyra)}</TableCell>
                    <TableCell align="right">{currency.format(row.hyresrabatt)}</TableCell>
                    <TableCell align="right">{currency.format(row.hyresreduktion)}</TableCell>
                    <TableCell align="right">{currency.format(row.arshyraMedRed)}</TableCell>
                    <TableCell align="right">{currency.format(row.manadshyra)}</TableCell>
                    <TableCell align="right">{currency.format(row.missadIntakt)}</TableCell>
                    <TableCell align="right">{currency.format(row.ovrigaMissadeKostnader)}</TableCell>
                    <TableCell align="right">
                      <strong>{currency.format(row.totalMissat)}</strong>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, whiteSpace: "normal" }}>
                      {row.kommentar}
                    </TableCell>
                    <TableCell>{row.ansvarig}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                        <IconButton
                          aria-label="Redigera"
                          size="small"
                          onClick={() => openEdit(row)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        {isHusforman && (
                          <IconButton
                            aria-label="Ta bort"
                            size="small"
                            onClick={() => setDeletingRow(row)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
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

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Lägg till missad hyra</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {addError && <Alert severity="error">{addError}</Alert>}
            <Typography variant="body2" color="text.secondary">
              Välj en lägenhet som ännu inte finns i listan. Övriga fält
              (faktiskt inflytt, kommentar, ansvarig, övriga kostnader) fylls
              i genom att redigera raden efteråt.
            </Typography>
            <Autocomplete
              options={availableApartments}
              getOptionLabel={(a) => `${a.lagenhetsnummer} · ${a.fastighet} (ledig ${a.ledigFrom})`}
              value={addApartment}
              onChange={(_, value) => setAddApartment(value)}
              disabled={isAdding}
              renderInput={(params) => (
                <TextField {...params} label="Lägenhet" fullWidth />
              )}
              noOptionsText="Inga lägenheter att välja — alla finns redan i listan."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={isAdding}>
            Avbryt
          </Button>
          <Button onClick={handleAdd} variant="contained" disabled={isAdding || !addApartment}>
            Lägg till
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editingRow}
        onClose={() => setEditingRow(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          Redigera {editingRow?.lagenhetsnummer}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <TextField
              label="Faktiskt inflytt"
              type="date"
              value={editForm.faktisktInflyttDatum}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, faktisktInflyttDatum: e.target.value }))
              }
              disabled={isSaving}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Övriga missade kostnader (kr)"
              type="number"
              value={editForm.ovrigaMissadeKostnader}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, ovrigaMissadeKostnader: e.target.value }))
              }
              disabled={isSaving}
              helperText="Läggs till missad intäkt i totalsumman, t.ex. fel belopp i kontraktet."
              fullWidth
            />
            <TextField
              label="Kommentar"
              value={editForm.kommentar}
              onChange={(e) =>
                setEditForm((prev) => ({ ...prev, kommentar: e.target.value }))
              }
              disabled={isSaving}
              multiline
              minRows={2}
              fullWidth
            />
            <Autocomplete
              freeSolo
              options={ansvarigOptions}
              value={editForm.ansvarig}
              onInputChange={(_, value) =>
                setEditForm((prev) => ({ ...prev, ansvarig: value }))
              }
              disabled={isSaving}
              renderInput={(params) => (
                <TextField {...params} label="Ansvarig" fullWidth />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingRow(null)} disabled={isSaving}>
            Avbryt
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={isSaving}>
            Spara
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deletingRow} onClose={() => setDeletingRow(null)}>
        <DialogTitle>Ta bort rad</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Är du säker på att du vill ta bort raden för{" "}
            {deletingRow?.lagenhetsnummer}? Om lägenheten fortfarande står
            tom efter borttagning läggs raden tillbaka nästa gång sidan
            laddas.
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
