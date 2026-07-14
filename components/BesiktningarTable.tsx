"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import ArchiveIcon from "@mui/icons-material/Archive";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
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
  markBetalningGjordAction,
  markKlarForBetalningAction,
  updateBesiktningAction,
} from "@/app/besiktningar/actions";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import type { Besiktning, BesiktningEditInput } from "@/lib/besiktningar";
import { ARCHIVE_ROLES, ROLES, hasAnyRole, hasRole } from "@/lib/roles";

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
  | "totaltAvdrag";

type Order = "asc" | "desc";

const columns: Array<{ key: ColumnKey; label: string; align?: "right" }> = [
  { key: "besiktningsdatum", label: "Besiktningsdatum" },
  { key: "lagenhetsnummer", label: "Lägenhetsnummer" },
  { key: "kostnadStadning", label: "Kostnad städning", align: "right" },
  { key: "vaktmastareAnteckning", label: "Vaktmästare anteckning" },
  { key: "godkand", label: "Godkänd?" },
  { key: "husformanAnteckning", label: "Husförman anteckning" },
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
  totaltAvdrag: (b) => b.totaltAvdrag,
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

type EditForm = {
  besiktningsdatum: string;
  kostnadStadning: string;
  vaktmastareAnteckning: string;
  godkand: string; // "" | "ja" | "nej"
  husformanAnteckning: string;
  totaltAvdrag: string;
};

function toEditForm(b: Besiktning): EditForm {
  return {
    besiktningsdatum: b.besiktningsdatum,
    kostnadStadning: String(b.kostnadStadning),
    vaktmastareAnteckning: b.vaktmastareAnteckning,
    godkand: b.godkand === true ? "ja" : b.godkand === false ? "nej" : "",
    husformanAnteckning: b.husformanAnteckning,
    totaltAvdrag: String(b.totaltAvdrag),
  };
}

export default function BesiktningarTable({ besiktningar }: Props) {
  const { user } = useUser();
  const canArchive = hasAnyRole(user, ARCHIVE_ROLES);
  const canManagePayment = hasRole(user, ROLES.HUSVD) || hasRole(user, ROLES.EKONOMI);

  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColumnKey>("besiktningsdatum");
  const [order, setOrder] = useState<Order>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [isPending, startTransition] = useTransition();

  const [editingRow, setEditingRow] = useState<Besiktning | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const [archivingRow, setArchivingRow] = useState<Besiktning | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [isArchiving, startArchiveTransition] = useTransition();

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

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Besiktningar
        </Typography>
        <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport}>
          Exportera
        </Button>
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
        <Table aria-label="Besiktningar" size="small" sx={{ minWidth: 1200 }}>
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
              <TableCell>Klar för betalning</TableCell>
              <TableCell>Betalning gjord</TableCell>
              <TableCell align="right">Åtgärder</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 3} align="center">
                  {besiktningar.length === 0
                    ? "Inga besiktningar registrerade."
                    : "Inga träffar."}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => (
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

      <Dialog open={!!archivingRow} onClose={() => setArchivingRow(null)}>
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
    </>
  );
}
