"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import dynamic from "next/dynamic";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
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
import type {
  FastighetAlias,
  ImportFieldConfig,
  RentalObjectTabGroup,
  TableColumnConfig,
} from "@/lib/table-columns";
import ColumnVisibilityMenu from "@/components/ColumnVisibilityMenu";
import RentalObjectFormDialog from "@/components/RentalObjectFormDialog";
import { useColumnVisibility } from "@/lib/use-column-visibility";

const RentalObjectExcelImport = dynamic(() => import("@/components/RentalObjectExcelImport"), { ssr: false });

type Props = {
  objects: RentalObject[];
  fastigheter: string[];
  aliases: FastighetAlias[];
  columnSettings: TableColumnConfig[];
  importSingleFields: ImportFieldConfig[];
  importTabGroups: RentalObjectTabGroup[];
  importMultiTab: boolean;
};

// Built-in numeric fields — null renders as "—", and the currency subset
// gets sv-SE thousands formatting. Everything else (built-in or custom)
// renders as plain text.
const CURRENCY_KEYS = new Set([
  "malbildshyra",
  "hyresrabatt",
  "hyresred",
  "individuellArshyra",
  "manadshyra",
]);
const NUMERIC_KEYS = new Set(["area", "areaInkKorr", "renoveringsbehov", ...CURRENCY_KEYS]);

const rawNumericValue: Record<string, (o: RentalObject) => number | null> = {
  area: (o) => o.area,
  areaInkKorr: (o) => o.areaInkKorr,
  malbildshyra: (o) => o.malbildshyra,
  renoveringsbehov: (o) => o.renoveringsbehov,
  hyresrabatt: (o) => o.hyresrabatt,
  hyresred: (o) => o.hyresred,
  individuellArshyra: (o) => o.individuellArshyra,
  manadshyra: (o) => o.manadshyra,
};

const builtInValue: Record<string, (o: RentalObject) => string | number> = {
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

function getColumnValue(o: RentalObject, col: TableColumnConfig): string | number {
  if (col.isCustom) return o.custom?.[col.key] ?? "";
  return builtInValue[col.key]?.(o) ?? "";
}

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

export default function RentalObjectsTable({
  objects,
  fastigheter,
  aliases,
  columnSettings,
  importSingleFields,
  importTabGroups,
  importMultiTab,
}: Props) {
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState("lagenhetsnummer");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [importOpen, setImportOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingObject, setEditingObject] = useState<RentalObject | null>(null);
  const [dialogKey, setDialogKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingLabel, setDeletingLabel] = useState("");
  const [isDeleting, startDeleteTransition] = useTransition();

  const nationColumns = useMemo(() => columnSettings.filter((c) => c.visible), [columnSettings]);
  const { isVisible, toggle } = useColumnVisibility("rentalobjects");
  const visibleColumns = nationColumns.filter((c) => isVisible(c.key));
  const customFieldDefs = useMemo(
    () => columnSettings.filter((c) => c.isCustom).map((c) => ({ key: c.key, label: c.label })),
    [columnSettings]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("sv");
    const filtered = objects.filter((o) => matchesSearch(o, q));
    const dir = order === "asc" ? 1 : -1;
    const orderCol = columnSettings.find((c) => c.key === orderBy) ?? columnSettings[0];
    return filtered.sort((a, b) => dir * compare(getColumnValue(a, orderCol), getColumnValue(b, orderCol)));
  }, [objects, search, orderBy, order, columnSettings]);

  function handleSort(col: TableColumnConfig) {
    if (orderBy === col.key) setOrder((p) => (p === "asc" ? "desc" : "asc"));
    else { setOrderBy(col.key); setOrder("asc"); }
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

  // Export always uses every nation-visible column, regardless of what the
  // user has personally hidden for on-screen readability.
  function handleExport() {
    exportRowsToXlsx(
      `databas-${new Date().toISOString().slice(0, 10)}.xlsx`,
      nationColumns.map((c) => c.label),
      visible.map((o) => nationColumns.map((c) => getColumnValue(o, c)))
    );
  }

  function renderCell(o: RentalObject, col: TableColumnConfig): ReactNode {
    if (!col.isCustom && NUMERIC_KEYS.has(col.key)) {
      const raw = rawNumericValue[col.key]!(o);
      if (raw == null) return "—";
      return CURRENCY_KEYS.has(col.key) ? currency.format(raw) : raw;
    }
    if (!col.isCustom && col.key === "typ") {
      return o.typ || "—";
    }
    return getColumnValue(o, col);
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}
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
        label="Sök"
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

      <Box sx={{ display: { xs: "none", sm: "block" } }}>
      <TableContainer component={Paper}>
        <Table
          size="small"
          aria-label="Databas"
          sx={{ "& .MuiTableCell-root": { px: 1.25, py: 0.75, fontSize: "0.8125rem" } }}
        >
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <ColumnVisibilityMenu columns={nationColumns} isVisible={isVisible} onToggle={toggle} />
              </TableCell>
              {visibleColumns.map((col) => (
                <TableCell
                  key={col.key}
                  align={NUMERIC_KEYS.has(col.key) ? "right" : undefined}
                  sortDirection={orderBy === col.key ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === col.key}
                    direction={orderBy === col.key ? order : "asc"}
                    onClick={() => handleSort(col)}
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
                <TableCell colSpan={visibleColumns.length + 2} align="center">
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
                    <TableCell padding="checkbox" />
                    {visibleColumns.map((col) => (
                      <TableCell key={col.key} align={NUMERIC_KEYS.has(col.key) ? "right" : undefined}>
                        {renderCell(o, col)}
                      </TableCell>
                    ))}
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
      </Box>

      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 1 }}>
          <ColumnVisibilityMenu columns={nationColumns} isVisible={isVisible} onToggle={toggle} />
        </Stack>
        {visible.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            {objects.length === 0
              ? "Inga hyresobjekt. Importera från Excel för att komma igång."
              : "Inga träffar."}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {visible
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((o) => (
                <Card key={o.id} variant="outlined">
                  <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                    <Stack direction="row" sx={{ justifyContent: "flex-end", gap: 0.5, mb: 1 }}>
                      <IconButton aria-label="Redigera" size="small" onClick={() => openEdit(o)}>
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
                    </Stack>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 1 }}>
                      {visibleColumns.map((col) => (
                        <Box key={col.key} sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {col.label}
                          </Typography>
                          <Box sx={{ overflowWrap: "break-word" }}>{renderCell(o, col)}</Box>
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
        customFieldDefs={customFieldDefs}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <RentalObjectExcelImport
        open={importOpen}
        singleFields={importSingleFields}
        multiTab={importMultiTab}
        tabGroups={importTabGroups}
        aliases={aliases}
        onClose={() => setImportOpen(false)}
      />

      <Dialog open={!!deletingId} onClose={() => setDeletingId(null)} fullWidth maxWidth="xs">
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
