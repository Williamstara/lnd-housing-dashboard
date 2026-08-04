"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useMemo, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import AddIcon from "@mui/icons-material/Add";
import ArchiveIcon from "@mui/icons-material/Archive";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  archiveBesiktningAction,
  archiveBesiktningarBulkAction,
  createBesiktningAction,
  deleteBesiktningAction,
  markBetalningGjordAction,
  markBetalningGjordBulkAction,
  markKlarForBetalningAction,
  markKlarForBetalningBulkAction,
  updateBesiktningAction,
} from "@/app/besiktningar/actions";
import ColumnVisibilityMenu from "@/components/ColumnVisibilityMenu";
import SegmentedBar from "@/components/charts/SegmentedBar";
import { STATUS } from "@/components/charts/palette";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import type { Besiktning, BesiktningEditInput, BesiktningImportInput } from "@/lib/besiktningar";
import { ARCHIVE_ROLES, ROLES, hasAnyRole, hasRole } from "@/lib/roles";
import type { ImportFieldConfig } from "@/lib/table-columns";
import { useColumnVisibility } from "@/lib/use-column-visibility";

const BesiktningarExcelImportDialog = dynamic(
  () => import("@/components/BesiktningarExcelImportDialog"),
  { ssr: false }
);

type Props = {
  besiktningar: Besiktning[];
  importMapping: ImportFieldConfig[];
};

type ColumnKey =
  | "besiktningsdatum"
  | "lagenhetsnummer"
  | "kostnadStadning"
  | "vaktmastareAnteckning"
  | "godkand"
  | "husformanAnteckning"
  | "ovrigaAnteckningar"
  | "totaltAvdrag";

type Order = "asc" | "desc";

const columns: Array<{ key: ColumnKey; label: string; align?: "right" }> = [
  { key: "besiktningsdatum", label: "Besiktningsdatum" },
  { key: "lagenhetsnummer", label: "Lägenhetsnummer" },
  { key: "kostnadStadning", label: "Kostnad städning", align: "right" },
  { key: "vaktmastareAnteckning", label: "Vaktmästare anteckning" },
  { key: "godkand", label: "Godkänd?" },
  { key: "husformanAnteckning", label: "Husförman anteckning" },
  { key: "ovrigaAnteckningar", label: "Övriga anteckningar" },
  { key: "totaltAvdrag", label: "Totalt avdrag", align: "right" },
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
  ovrigaAnteckningar: (b) => b.ovrigaAnteckningar,
  totaltAvdrag: (b) => b.totaltAvdrag,
};

const currency = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "sv", { sensitivity: "base" });
}

function matchesSearch(row: Besiktning, query: string): boolean {
  if (!query) return true;
  return [row.lagenhetsnummer, row.vaktmastareAnteckning, row.husformanAnteckning, row.ovrigaAnteckningar]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("sv")
    .includes(query);
}

type EditForm = {
  besiktningsdatum: string;
  kostnadStadning: string;
  vaktmastareAnteckning: string;
  godkand: string; // "" | "ja" | "nej"
  husformanAnteckning: string;
  ovrigaAnteckningar: string;
  totaltAvdrag: string;
};

function toEditForm(b: Besiktning): EditForm {
  return {
    besiktningsdatum: b.besiktningsdatum,
    kostnadStadning: String(b.kostnadStadning),
    vaktmastareAnteckning: b.vaktmastareAnteckning,
    godkand: b.godkand === true ? "ja" : b.godkand === false ? "nej" : "",
    husformanAnteckning: b.husformanAnteckning,
    ovrigaAnteckningar: b.ovrigaAnteckningar,
    totaltAvdrag: String(b.totaltAvdrag),
  };
}

type AddForm = EditForm & { lagenhetsnummer: string };

function emptyAddForm(): AddForm {
  return {
    lagenhetsnummer: "",
    besiktningsdatum: new Date().toISOString().slice(0, 10),
    kostnadStadning: "0",
    vaktmastareAnteckning: "",
    godkand: "",
    husformanAnteckning: "",
    ovrigaAnteckningar: "",
    totaltAvdrag: "0",
  };
}

export default function BesiktningarTable({ besiktningar, importMapping }: Props) {
  const { user } = useUser();
  // Archiving besiktningar is husvd/admin only — ekonomi lost this right,
  // unlike every other "archive" feature in the app, which still shares
  // ARCHIVE_ROLES (ekonomi/husvd/admin). Deleting is unaffected and still
  // uses the broader set.
  const canArchive = hasRole(user, ROLES.HUSVD);
  const canDelete = hasAnyRole(user, ARCHIVE_ROLES);
  const canManagePayment = hasRole(user, ROLES.HUSVD) || hasRole(user, ROLES.EKONOMI);

  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColumnKey>("besiktningsdatum");
  const [order, setOrder] = useState<Order>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [isPending, startTransition] = useTransition();

  const [editingRow, setEditingRow] = useState<Besiktning | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const [archivingRow, setArchivingRow] = useState<Besiktning | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, startArchiveTransition] = useTransition();

  const [deletingRow, setDeletingRow] = useState<Besiktning | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [importOpen, setImportOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyAddForm);
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, startAddTransition] = useTransition();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPending, startBulkTransition] = useTransition();
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkDate, setBulkDate] = useState("");

  const { isVisible, toggle } = useColumnVisibility("besiktningar");
  const visibleColumnDefs = columns.filter((c) => isVisible(c.key));

  const visibleRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sv");
    const filtered = besiktningar.filter((b) => matchesSearch(b, query));
    const direction = order === "asc" ? 1 : -1;
    const getValue = columnValue[orderBy];
    return filtered.sort((a, b) => direction * compareValues(getValue(a), getValue(b)));
  }, [besiktningar, search, orderBy, order]);

  // Mirrors the row-highlight rule below (success outline once betald,
  // warning outline once klar för betalning, no outline otherwise) so the
  // chart's three buckets always match what the table itself is showing.
  const statusCounts = useMemo(() => {
    let obehandlade = 0;
    let klaraForBetalning = 0;
    let betalda = 0;
    for (const b of besiktningar) {
      if (b.betalningGjordDatum) betalda++;
      else if (b.klarForBetalningDatum) klaraForBetalning++;
      else obehandlade++;
    }
    return { obehandlade, klaraForBetalning, betalda };
  }, [besiktningar]);

  const statusSegments = [
    { label: "Obehandlade", value: statusCounts.obehandlade, color: STATUS.serious },
    { label: "Klara för betalning", value: statusCounts.klaraForBetalning, color: STATUS.warning },
    { label: "Betalda", value: statusCounts.betalda, color: STATUS.good },
  ];

  const pageRows = visibleRows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((row) => selectedIds.has(row.id));
  const someOnPageSelected = pageRows.some((row) => selectedIds.has(row.id));

  const rowsForBulkDate = useMemo(
    () => (bulkDate ? besiktningar.filter((b) => b.besiktningsdatum === bulkDate) : []),
    [besiktningar, bulkDate]
  );

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
      `besiktningar-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [
        ...columns.map((c) => c.label),
        "Klar för betalning",
        "Klar för betalning av",
        "Betalning gjord",
        "Betalning gjord av",
      ],
      visibleRows.map((row) => [
        ...columns.map((c) => columnValue[c.key](row)),
        row.klarForBetalningDatum ?? "",
        row.klarForBetalningAv ?? "",
        row.betalningGjordDatum ?? "",
        row.betalningGjordAv ?? "",
      ])
    );
  }

  function openEdit(row: Besiktning) {
    setEditError(null);
    setEditingRow(row);
    setEditForm(toEditForm(row));
  }

  function handleSave() {
    if (!editingRow || !editForm) return;
    const id = editingRow.id;
    const input: BesiktningEditInput = {
      besiktningsdatum: editForm.besiktningsdatum,
      kostnadStadning: Number(editForm.kostnadStadning) || 0,
      vaktmastareAnteckning: editForm.vaktmastareAnteckning.trim(),
      godkand: editForm.godkand === "ja" ? true : editForm.godkand === "nej" ? false : null,
      husformanAnteckning: editForm.husformanAnteckning.trim(),
      ovrigaAnteckningar: editForm.ovrigaAnteckningar.trim(),
      totaltAvdrag: Number(editForm.totaltAvdrag) || 0,
    };
    setEditError(null);
    startSaveTransition(async () => {
      try {
        await updateBesiktningAction(id, input);
        setEditingRow(null);
      } catch {
        setEditError("Något gick fel. Försök igen.");
      }
    });
  }

  function sendKlarForBetalning(id: string) {
    startTransition(async () => {
      await markKlarForBetalningAction(id);
    });
  }

  function sendBetalningGjord(id: string) {
    startTransition(async () => {
      await markBetalningGjordAction(id);
    });
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of pageRows) {
        if (checked) next.add(row.id);
        else next.delete(row.id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Selection follows the date field directly (no separate click): picking
  // a date selects every matching row, and that selection holds — including
  // through manual per-row adjustments — until the date field itself
  // changes again, at which point it's replaced with the new date's rows.
  function handleBulkDateChange(date: string) {
    setBulkDate(date);
    const ids = date ? besiktningar.filter((b) => b.besiktningsdatum === date).map((b) => b.id) : [];
    setSelectedIds(new Set(ids));
  }

  // None of the three bulk actions clear the selection when they finish —
  // it holds until the date field changes (handleBulkDateChange) or the
  // user presses "Avmarkera alla", so the same date's selection can be
  // walked through klar-för-betalning → betalning gjord → arkivera without
  // re-picking the date between each step.
  function bulkMarkKlarForBetalning() {
    const ids = [...selectedIds];
    setBulkMessage(null);
    startBulkTransition(async () => {
      const result = await markKlarForBetalningBulkAction(ids);
      setBulkMessage(
        `${result.updated} markerade som klara för betalning.` +
          (result.skipped > 0 ? ` ${result.skipped} hoppades över (redan klara).` : "")
      );
    });
  }

  function bulkMarkBetalningGjord() {
    const ids = [...selectedIds];
    setBulkMessage(null);
    startBulkTransition(async () => {
      const result = await markBetalningGjordBulkAction(ids);
      setBulkMessage(
        `${result.updated} markerade som betalda.` +
          (result.skipped > 0
            ? ` ${result.skipped} hoppades över (ej klara för betalning eller redan betalda).`
            : "")
      );
    });
  }

  function bulkArchive() {
    const ids = [...selectedIds];
    setBulkMessage(null);
    startBulkTransition(async () => {
      const result = await archiveBesiktningarBulkAction(ids);
      setBulkMessage(
        `${result.updated} arkiverade.` +
          (result.skipped > 0 ? ` ${result.skipped} hoppades över (betalning ej gjord ännu).` : "")
      );
    });
  }

  function openAdd() {
    setAddError(null);
    setAddForm(emptyAddForm());
    setAddOpen(true);
  }

  function handleAdd() {
    const input: BesiktningImportInput = {
      lagenhetsnummer: addForm.lagenhetsnummer.trim(),
      besiktningsdatum: addForm.besiktningsdatum,
      kostnadStadning: Number(addForm.kostnadStadning) || 0,
      vaktmastareAnteckning: addForm.vaktmastareAnteckning.trim(),
      godkand: addForm.godkand === "ja" ? true : addForm.godkand === "nej" ? false : null,
      husformanAnteckning: addForm.husformanAnteckning.trim(),
      ovrigaAnteckningar: addForm.ovrigaAnteckningar.trim(),
      totaltAvdrag: Number(addForm.totaltAvdrag) || 0,
    };
    setAddError(null);
    startAddTransition(async () => {
      try {
        await createBesiktningAction(input);
        setAddOpen(false);
      } catch (err) {
        setAddError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  function openArchive(row: Besiktning) {
    setArchiveError(null);
    setArchivingRow(row);
  }

  function confirmArchive() {
    if (!archivingRow) return;
    const id = archivingRow.id;
    setArchiveError(null);
    startArchiveTransition(async () => {
      try {
        await archiveBesiktningAction(id);
        setArchivingRow(null);
      } catch (err) {
        setArchiveError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  function renderCellValue(row: Besiktning, key: ColumnKey): ReactNode {
    if (key === "kostnadStadning" || key === "totaltAvdrag") {
      return currency.format(row[key]);
    }
    return columnValue[key](row);
  }

  function openDelete(row: Besiktning) {
    setDeleteError(null);
    setDeletingRow(row);
  }

  function confirmDelete() {
    if (!deletingRow) return;
    const id = deletingRow.id;
    setDeleteError(null);
    startDeleteTransition(async () => {
      try {
        await deleteBesiktningAction(id);
        setDeletingRow(null);
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Besiktningar
        </Typography>
        <Stack direction="row" sx={{ gap: 1 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
            Lägg till besiktning
          </Button>
          <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport}>
            Exportera
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => setImportOpen(true)}
          >
            Ladda upp från excel
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Status
        </Typography>
        {besiktningar.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Inga besiktningar registrerade.
          </Typography>
        ) : (
          <SegmentedBar segments={statusSegments} />
        )}
      </Paper>

      <TextField
        label="Sök"
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

      <Stack direction="row" sx={{ gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          label="Markera efter besiktningsdatum"
          type="date"
          value={bulkDate}
          onChange={(e) => handleBulkDateChange(e.target.value)}
          size="small"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Box aria-live="polite">
          {bulkDate && rowsForBulkDate.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              Inga besiktningar med detta datum.
            </Typography>
          )}
        </Box>
      </Stack>

      {bulkMessage && (
        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setBulkMessage(null)}>
          {bulkMessage}
        </Alert>
      )}

      {selectedIds.size > 0 && (
        <Stack direction="row" sx={{ alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {selectedIds.size} valda
          </Typography>
          {canManagePayment && (
            <Button
              size="small"
              variant="outlined"
              disabled={isBulkPending}
              onClick={bulkMarkKlarForBetalning}
            >
              Klar för betalning
            </Button>
          )}
          {canManagePayment && (
            <Button
              size="small"
              variant="contained"
              disabled={isBulkPending}
              onClick={bulkMarkBetalningGjord}
            >
              Betalning gjord
            </Button>
          )}
          {canArchive && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<ArchiveIcon fontSize="small" />}
              disabled={isBulkPending}
              onClick={bulkArchive}
            >
              Arkivera
            </Button>
          )}
          <Button size="small" onClick={clearSelection} disabled={isBulkPending}>
            Avmarkera alla
          </Button>
        </Stack>
      )}

      <Box sx={{ display: { xs: "none", sm: "block" } }}>
      <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
        <Table aria-label="Besiktningar" size="small" sx={{ minWidth: 1200 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allOnPageSelected}
                  indeterminate={someOnPageSelected && !allOnPageSelected}
                  onChange={(e) => toggleSelectPage(e.target.checked)}
                />
              </TableCell>
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
              <TableCell>Klar för betalning</TableCell>
              <TableCell>Betalning gjord</TableCell>
              <TableCell align="right">Åtgärder</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnDefs.length + 5} align="center">
                  {besiktningar.length === 0
                    ? "Inga besiktningar registrerade."
                    : "Inga träffar."}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                  <TableRow
                    key={row.id}
                    sx={
                      row.betalningGjordDatum
                        ? {
                            outline: "2px solid",
                            outlineColor: "success.main",
                            outlineOffset: "-5px",
                            borderRadius: 1,
                          }
                        : row.klarForBetalningDatum
                        ? {
                            outline: "2px solid",
                            outlineColor: "warning.main",
                            outlineOffset: "-5px",
                            borderRadius: 1,
                          }
                        : undefined
                    }
                  >
                    <TableCell padding="checkbox">
                      <Checkbox checked={selectedIds.has(row.id)} onChange={() => toggleSelected(row.id)} />
                    </TableCell>
                    <TableCell padding="checkbox" />
                    {visibleColumnDefs.map((column) => (
                      <TableCell
                        key={column.key}
                        align={column.align}
                        sx={
                          column.key === "vaktmastareAnteckning" ||
                          column.key === "husformanAnteckning" ||
                          column.key === "ovrigaAnteckningar"
                            ? { maxWidth: 200, whiteSpace: "normal" }
                            : undefined
                        }
                      >
                        {renderCellValue(row, column.key)}
                      </TableCell>
                    ))}
                    <TableCell>
                      {row.klarForBetalningDatum ? (
                        <>
                          {row.klarForBetalningDatum}
                          {row.klarForBetalningAv && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              av {row.klarForBetalningAv}
                            </Typography>
                          )}
                        </>
                      ) : canManagePayment ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={isPending}
                          onClick={() => sendKlarForBetalning(row.id)}
                        >
                          Klar för betalning
                        </Button>
                      ) : (
                        "Ej klar"
                      )}
                    </TableCell>
                    <TableCell>
                      {row.betalningGjordDatum ? (
                        <>
                          {row.betalningGjordDatum}
                          {row.betalningGjordAv && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              av {row.betalningGjordAv}
                            </Typography>
                          )}
                        </>
                      ) : canManagePayment ? (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={isPending || !row.klarForBetalningDatum}
                          onClick={() => sendBetalningGjord(row.id)}
                        >
                          Betalning gjord
                        </Button>
                      ) : (
                        "Ej betald"
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                        <IconButton
                          aria-label="Redigera"
                          size="small"
                          onClick={() => openEdit(row)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        {canArchive && (
                          <Tooltip
                            title={
                              row.betalningGjordDatum
                                ? "Arkivera"
                                : "Kan inte arkiveras förrän betalning är gjord"
                            }
                          >
                            <span>
                              <IconButton
                                aria-label="Arkivera"
                                size="small"
                                disabled={!row.betalningGjordDatum}
                                onClick={() => openArchive(row)}
                              >
                                <ArchiveIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {canDelete && (
                          <IconButton
                            aria-label="Ta bort"
                            size="small"
                            onClick={() => openDelete(row)}
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
      </Box>

      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Stack direction="row" sx={{ alignItems: "center", gap: 0.5 }}>
            <Checkbox
              checked={allOnPageSelected}
              indeterminate={someOnPageSelected && !allOnPageSelected}
              onChange={(e) => toggleSelectPage(e.target.checked)}
              size="small"
            />
            <Typography variant="caption" color="text.secondary">
              Markera alla
            </Typography>
          </Stack>
          <ColumnVisibilityMenu columns={columns} isVisible={isVisible} onToggle={toggle} />
        </Stack>
        {visibleRows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            {besiktningar.length === 0 ? "Inga besiktningar registrerade." : "Inga träffar."}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {pageRows.map((row) => (
              <Card
                key={row.id}
                variant="outlined"
                sx={
                  row.betalningGjordDatum
                    ? { borderColor: "success.main", borderWidth: 2 }
                    : row.klarForBetalningDatum
                    ? { borderColor: "warning.main", borderWidth: 2 }
                    : undefined
                }
              >
                <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 0.5, mb: 1 }}>
                    <Checkbox checked={selectedIds.has(row.id)} onChange={() => toggleSelected(row.id)} size="small" />
                    <Stack direction="row" sx={{ gap: 0.5 }}>
                    <IconButton aria-label="Redigera" size="small" onClick={() => openEdit(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {canArchive && (
                      <Tooltip
                        title={
                          row.betalningGjordDatum
                            ? "Arkivera"
                            : "Kan inte arkiveras förrän betalning är gjord"
                        }
                      >
                        <span>
                          <IconButton
                            aria-label="Arkivera"
                            size="small"
                            disabled={!row.betalningGjordDatum}
                            onClick={() => openArchive(row)}
                          >
                            <ArchiveIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <IconButton aria-label="Ta bort" size="small" onClick={() => openDelete(row)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                    </Stack>
                  </Stack>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 1 }}>
                    {visibleColumnDefs.map((column) => (
                      <Box
                        key={column.key}
                        sx={{
                          minWidth: 0,
                          gridColumn:
                            column.key === "vaktmastareAnteckning" ||
                            column.key === "husformanAnteckning" ||
                            column.key === "ovrigaAnteckningar"
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
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Klar för betalning
                      </Typography>
                      {row.klarForBetalningDatum ? (
                        <>
                          {row.klarForBetalningDatum}
                          {row.klarForBetalningAv && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              av {row.klarForBetalningAv}
                            </Typography>
                          )}
                        </>
                      ) : canManagePayment ? (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={isPending}
                          onClick={() => sendKlarForBetalning(row.id)}
                        >
                          Klar för betalning
                        </Button>
                      ) : (
                        "Ej klar"
                      )}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Betalning gjord
                      </Typography>
                      {row.betalningGjordDatum ? (
                        <>
                          {row.betalningGjordDatum}
                          {row.betalningGjordAv && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                              av {row.betalningGjordAv}
                            </Typography>
                          )}
                        </>
                      ) : canManagePayment ? (
                        <Button
                          size="small"
                          variant="contained"
                          disabled={isPending || !row.klarForBetalningDatum}
                          onClick={() => sendBetalningGjord(row.id)}
                        >
                          Betalning gjord
                        </Button>
                      ) : (
                        "Ej betald"
                      )}
                    </Box>
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

      <Dialog open={!!editingRow} onClose={() => setEditingRow(null)} fullWidth maxWidth="sm">
        <DialogTitle>Redigera besiktning {editingRow?.lagenhetsnummer}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            {editForm && (
              <>
                <TextField
                  label="Besiktningsdatum"
                  type="date"
                  value={editForm.besiktningsdatum}
                  onChange={(e) => setEditForm((prev) => prev && { ...prev, besiktningsdatum: e.target.value })}
                  disabled={isSaving}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
                <TextField
                  label="Kostnad städning (kr)"
                  type="number"
                  value={editForm.kostnadStadning}
                  onChange={(e) => setEditForm((prev) => prev && { ...prev, kostnadStadning: e.target.value })}
                  disabled={isSaving}
                  fullWidth
                />
                <TextField
                  label="Vaktmästare anteckning"
                  value={editForm.vaktmastareAnteckning}
                  onChange={(e) => setEditForm((prev) => prev && { ...prev, vaktmastareAnteckning: e.target.value })}
                  disabled={isSaving}
                  multiline
                  minRows={2}
                  fullWidth
                />
                <TextField
                  select
                  label="Godkänd?"
                  value={editForm.godkand}
                  onChange={(e) => setEditForm((prev) => prev && { ...prev, godkand: e.target.value })}
                  disabled={isSaving}
                  fullWidth
                >
                  <MenuItem value="">—</MenuItem>
                  <MenuItem value="ja">Ja</MenuItem>
                  <MenuItem value="nej">Nej</MenuItem>
                </TextField>
                <TextField
                  label="Husförman anteckning"
                  value={editForm.husformanAnteckning}
                  onChange={(e) => setEditForm((prev) => prev && { ...prev, husformanAnteckning: e.target.value })}
                  disabled={isSaving}
                  multiline
                  minRows={2}
                  fullWidth
                />
                <TextField
                  label="Övriga anteckningar"
                  value={editForm.ovrigaAnteckningar}
                  onChange={(e) => setEditForm((prev) => prev && { ...prev, ovrigaAnteckningar: e.target.value })}
                  disabled={isSaving}
                  multiline
                  minRows={2}
                  fullWidth
                />
                <TextField
                  label="Totalt avdrag (kr)"
                  type="number"
                  value={editForm.totaltAvdrag}
                  onChange={(e) => setEditForm((prev) => prev && { ...prev, totaltAvdrag: e.target.value })}
                  disabled={isSaving}
                  fullWidth
                />
              </>
            )}
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

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Lägg till besiktning</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {addError && <Alert severity="error">{addError}</Alert>}
            <TextField
              label="Lägenhetsnummer"
              value={addForm.lagenhetsnummer}
              onChange={(e) => setAddForm((prev) => ({ ...prev, lagenhetsnummer: e.target.value }))}
              disabled={isAdding}
              fullWidth
              autoFocus
            />
            <TextField
              label="Besiktningsdatum"
              type="date"
              value={addForm.besiktningsdatum}
              onChange={(e) => setAddForm((prev) => ({ ...prev, besiktningsdatum: e.target.value }))}
              disabled={isAdding}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="Kostnad städning (kr)"
              type="number"
              value={addForm.kostnadStadning}
              onChange={(e) => setAddForm((prev) => ({ ...prev, kostnadStadning: e.target.value }))}
              disabled={isAdding}
              fullWidth
            />
            <TextField
              label="Vaktmästare anteckning"
              value={addForm.vaktmastareAnteckning}
              onChange={(e) => setAddForm((prev) => ({ ...prev, vaktmastareAnteckning: e.target.value }))}
              disabled={isAdding}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              select
              label="Godkänd?"
              value={addForm.godkand}
              onChange={(e) => setAddForm((prev) => ({ ...prev, godkand: e.target.value }))}
              disabled={isAdding}
              fullWidth
            >
              <MenuItem value="">—</MenuItem>
              <MenuItem value="ja">Ja</MenuItem>
              <MenuItem value="nej">Nej</MenuItem>
            </TextField>
            <TextField
              label="Husförman anteckning"
              value={addForm.husformanAnteckning}
              onChange={(e) => setAddForm((prev) => ({ ...prev, husformanAnteckning: e.target.value }))}
              disabled={isAdding}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Övriga anteckningar"
              value={addForm.ovrigaAnteckningar}
              onChange={(e) => setAddForm((prev) => ({ ...prev, ovrigaAnteckningar: e.target.value }))}
              disabled={isAdding}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Totalt avdrag (kr)"
              type="number"
              value={addForm.totaltAvdrag}
              onChange={(e) => setAddForm((prev) => ({ ...prev, totaltAvdrag: e.target.value }))}
              disabled={isAdding}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={isAdding}>
            Avbryt
          </Button>
          <Button onClick={handleAdd} variant="contained" disabled={isAdding || !addForm.lagenhetsnummer.trim()}>
            Lägg till
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!archivingRow} onClose={() => setArchivingRow(null)} fullWidth maxWidth="xs">
        <DialogTitle>Arkivera besiktning</DialogTitle>
        <DialogContent>
          {archiveError && <Alert severity="error" sx={{ mb: 2 }}>{archiveError}</Alert>}
          <DialogContentText>
            Är du säker på att du vill arkivera besiktningen för{" "}
            {archivingRow?.lagenhetsnummer}? Den visas därefter i Arkiv istället
            för här.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchivingRow(null)} disabled={isArchiving}>
            Avbryt
          </Button>
          <Button onClick={confirmArchive} variant="contained" disabled={isArchiving}>
            Arkivera
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deletingRow} onClose={() => setDeletingRow(null)} fullWidth maxWidth="xs">
        <DialogTitle>Ta bort besiktning</DialogTitle>
        <DialogContent>
          {deleteError && <Alert severity="error" sx={{ mb: 2 }}>{deleteError}</Alert>}
          <DialogContentText>
            Är du säker på att du vill ta bort besiktningen för{" "}
            {deletingRow?.lagenhetsnummer}? Detta går inte att ångra.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingRow(null)} disabled={isDeleting}>
            Avbryt
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={isDeleting}>
            Ta bort
          </Button>
        </DialogActions>
      </Dialog>

      <BesiktningarExcelImportDialog
        open={importOpen}
        mapping={importMapping}
        onClose={() => setImportOpen(false)}
      />
    </>
  );
}
