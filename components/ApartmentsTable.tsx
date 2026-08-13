"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import dynamic from "next/dynamic";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import KeyIcon from "@mui/icons-material/Key";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
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
import { alpha } from "@mui/material/styles";
import {
  assignTenantAction,
  createApartmentAction,
  deleteApartmentAction,
  lookupApartmentSpecsAction,
  saveApartmentInterestAction,
  sendApartmentContactEmailInfoAction,
  setHiddenAction,
  setNyckelHamtadAction,
  setNyckelInlamnadAction,
  updateApartmentAction,
} from "@/app/lediga-lagenheter/actions";
import type {
  Apartment,
  ApartmentInput,
  ApartmentStatus,
  TenantAssignmentInput,
} from "@/lib/apartments";
import { FEATURES, isFeatureEnabled, type ImportFieldConfig, type TableColumnConfig } from "@/lib/table-columns";
import ApartmentFormDialog from "@/components/ApartmentFormDialog";
import ApartmentInterestDialog from "@/components/ApartmentInterestDialog";
import ColumnVisibilityMenu from "@/components/ColumnVisibilityMenu";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import { ROLES, hasRole } from "@/lib/roles";
import { useColumnVisibility } from "@/lib/use-column-visibility";

const ApartmentExcelImport = dynamic(() => import("@/components/ApartmentExcelImport"), { ssr: false });

type Props = {
  apartments: Apartment[];
  fastigheter: string[];
  fastighetPrefixes: Array<{ namn: string; prefixes: string[] }>;
  importMapping: ImportFieldConfig[];
  missedRentApartmentIds: string[];
  columnSettings: TableColumnConfig[];
  enabledFeatures?: string[];
  currency?: string;
  locale?: string;
};

const STATUS_LABELS: Record<ApartmentStatus, string> = {
  ledig: "Ledig",
  kontaktad: "Kontaktad",
  redo_for_kontrakt: "Skickad för kontrakt",
  arkiverad: "Arkiverad",
};

const STATUS_COLORS: Record<
  ApartmentStatus,
  "default" | "info" | "success"
> = {
  ledig: "default",
  kontaktad: "info",
  redo_for_kontrakt: "success",
  arkiverad: "default",
};

// Built-in fields that need special formatting/alignment. Anything not
// listed here (built-in or custom) renders as plain text, left-aligned.
const CURRENCY_KEYS = new Set([
  "arshyra",
  "hyresrabatt",
  "hyresreduktion",
  "arshyraMedRed",
  "manadshyra",
]);
const RIGHT_ALIGN_KEYS = new Set(["antalRum", ...CURRENCY_KEYS]);

const builtInValue: Record<string, (a: Apartment) => string | number> = {
  lagenhetsnummer: (a) => a.lagenhetsnummer,
  fastighet: (a) => a.fastighet,
  storlek: (a) => a.storlek,
  objekttyp: (a) => a.objekttyp,
  antalRum: (a) => a.antalRum,
  ledigFrom: (a) => a.ledigFrom,
  arshyra: (a) => a.arshyra,
  hyresrabatt: (a) => a.hyresrabatt,
  hyresreduktion: (a) => a.hyresreduktion,
  arshyraMedRed: (a) => a.arshyraMedRed,
  manadshyra: (a) => a.manadshyra,
  status: (a) => STATUS_LABELS[a.status],
};

function getColumnValue(apartment: Apartment, col: TableColumnConfig): string | number {
  if (col.isCustom) return apartment.custom?.[col.key] ?? "";
  return builtInValue[col.key]?.(apartment) ?? "";
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "sv", { sensitivity: "base" });
}

function matchesSearch(apartment: Apartment, query: string): boolean {
  if (!query) return true;
  const haystack = [
    apartment.lagenhetsnummer,
    apartment.fastighet,
    apartment.storlek,
    apartment.objekttyp,
    apartment.ledigFrom,
    STATUS_LABELS[apartment.status],
    apartment.kontaktperson,
    apartment.hyresgastNamn,
    apartment.epost,
    apartment.telefonnummer,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("sv");
  return haystack.includes(query);
}

export default function ApartmentsTable({
  apartments,
  fastigheter,
  fastighetPrefixes,
  importMapping,
  missedRentApartmentIds,
  columnSettings,
  enabledFeatures,
  currency = "kr",
  locale = "sv-SE",
}: Props) {
  const keyHandoverEnabled = isFeatureEnabled(enabledFeatures, FEATURES.KEY_HANDOVER);
  const numberFormat = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }), [locale]);
  const { user } = useUser();
  const isHusforman = hasRole(user, ROLES.HUSFORMAN);
  const missedRentIds = useMemo(() => new Set(missedRentApartmentIds), [missedRentApartmentIds]);
  const nationColumns = useMemo(() => columnSettings.filter((c) => c.visible), [columnSettings]);
  const { isVisible, toggle } = useColumnVisibility("apartments");
  const visibleColumns = nationColumns.filter((c) => isVisible(c.key));
  const customFieldDefs = useMemo(
    () => columnSettings.filter((c) => c.isCustom).map((c) => ({ key: c.key, label: c.label })),
    [columnSettings]
  );
  // nationColumns (not the per-user-narrowed visibleColumns) — the form
  // should respect the nation's own configured field set, independent of
  // which columns *this user* currently has the list view showing.
  const formVisibleKeys = useMemo(() => new Set(nationColumns.map((c) => c.key)), [nationColumns]);

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(
    null
  );
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestApartment, setInterestApartment] = useState<Apartment | null>(
    null
  );
  const [deletingApartment, setDeletingApartment] = useState<Apartment | null>(
    null
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isTogglingHidden, startHiddenTransition] = useTransition();
  const [isTogglingNyckel, startNyckelTransition] = useTransition();
  // Bumped on every dialog open so the dialogs remount with fresh state
  // instead of syncing props via an effect.
  const [dialogKey, setDialogKey] = useState(0);

  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [orderBy, setOrderBy] = useState<string>("ledigFrom");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const visibleApartments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sv");
    const filtered = apartments.filter(
      (apartment) =>
        (showHidden || !apartment.hidden) && matchesSearch(apartment, query)
    );
    const direction = order === "asc" ? 1 : -1;
    const orderCol = columnSettings.find((c) => c.key === orderBy) ?? columnSettings[0];
    return filtered.sort(
      (a, b) => direction * compareValues(getColumnValue(a, orderCol), getColumnValue(b, orderCol))
    );
  }, [apartments, search, showHidden, orderBy, order, columnSettings]);

  function handleSort(col: TableColumnConfig) {
    if (orderBy === col.key) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(col.key);
      setOrder("asc");
    }
    setPage(0);
  }

  function openCreateDialog() {
    setEditingApartment(null);
    setDialogKey((key) => key + 1);
    setFormOpen(true);
  }

  function openEditDialog(apartment: Apartment) {
    setEditingApartment(apartment);
    setDialogKey((key) => key + 1);
    setFormOpen(true);
  }

  function openInterestDialog(apartment: Apartment) {
    setInterestApartment(apartment);
    setDialogKey((key) => key + 1);
    setInterestOpen(true);
  }

  async function handleFormSubmit(input: ApartmentInput) {
    if (editingApartment) {
      await updateApartmentAction(editingApartment.id, input);
    } else {
      await createApartmentAction(input);
    }
  }

  async function handleSaveInterest(input: TenantAssignmentInput) {
    if (!interestApartment) return;
    await saveApartmentInterestAction(interestApartment.id, input);
  }

  async function handleSendToContract(input: TenantAssignmentInput) {
    if (!interestApartment) return;
    await assignTenantAction(interestApartment.id, input);
  }

  async function handleSendEmailInfo(input: TenantAssignmentInput, svarSenast: string) {
    if (!interestApartment) return;
    await sendApartmentContactEmailInfoAction(interestApartment.id, input, svarSenast);
  }

  function confirmDelete() {
    if (!deletingApartment) return;
    const id = deletingApartment.id;
    startDeleteTransition(async () => {
      await deleteApartmentAction(id);
      setDeletingApartment(null);
    });
  }

  function toggleHidden(apartment: Apartment) {
    startHiddenTransition(async () => {
      await setHiddenAction(apartment.id, !apartment.hidden);
    });
  }

  function toggleNyckelInlamnad(apartment: Apartment) {
    startNyckelTransition(async () => {
      await setNyckelInlamnadAction(apartment.id, !apartment.nyckelInlamnad);
    });
  }

  function toggleNyckelHamtad(apartment: Apartment) {
    if (!apartment.nyckelInlamnad) return;
    startNyckelTransition(async () => {
      await setNyckelHamtadAction(apartment.id, !apartment.nyckelHamtad);
    });
  }

  // Export always uses every nation-visible column, regardless of what the
  // user has personally hidden for on-screen readability — hiding a column
  // to declutter your own view shouldn't silently drop it from an export.
  function handleExport() {
    exportRowsToXlsx(
      `lediga-lagenheter-${new Date().toISOString().slice(0, 10)}.xlsx`,
      nationColumns.map((c) => c.label),
      visibleApartments.map((apartment) =>
        nationColumns.map((c) => getColumnValue(apartment, c))
      )
    );
  }

  function renderCell(apartment: Apartment, col: TableColumnConfig): ReactNode {
    if (!col.isCustom && col.key === "status") {
      return (
        <>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
            <Chip
              label={STATUS_LABELS[apartment.status]}
              color={STATUS_COLORS[apartment.status]}
              size="small"
            />
            {apartment.hidden && <Chip label="Dold" size="small" />}
            {missedRentIds.has(apartment.id) && (
              <Chip
                label="Missad hyra"
                color="error"
                size="small"
                sx={{ fontSize: "0.6875rem" }}
              />
            )}
          </Stack>
          {apartment.status === "ledig" && apartment.hyresgastNamn && (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Intresserad: {apartment.hyresgastNamn}
              </Typography>
            </Box>
          )}
          {apartment.status === "kontaktad" && (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {apartment.kontaktperson} — svar senast {apartment.svarSenast}
              </Typography>
            </Box>
          )}
          {apartment.status === "redo_for_kontrakt" && apartment.hyresgastNamn && (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {apartment.hyresgastNamn}
              </Typography>
            </Box>
          )}
        </>
      );
    }
    const value = getColumnValue(apartment, col);
    if (!col.isCustom && CURRENCY_KEYS.has(col.key)) {
      return numberFormat.format(Number(value));
    }
    return value;
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Lediga lägenheter
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
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreateDialog}
          >
            Lägg till lägenhet
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 2, gap: 2, flexWrap: "wrap" }}
      >
        <TextField
          label="Sök"
          placeholder="Sök lägenheter..."
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(0); }}
          size="small"
          sx={{ maxWidth: 360 }}
          fullWidth
        />
        <FormControlLabel
          control={
            <Switch
              checked={showHidden}
              onChange={(event) => setShowHidden(event.target.checked)}
              size="small"
            />
          }
          label="Visa dolda lägenheter"
        />
      </Stack>

      <Box sx={{ display: { xs: "none", sm: "block" } }}>
      <TableContainer component={Paper}>
        <Table
          aria-label="Lediga lägenheter"
          size="small"
          sx={{
            "& .MuiTableCell-root": {
              px: 1,
              py: 0.75,
              fontSize: "0.8125rem",
            },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <ColumnVisibilityMenu columns={nationColumns} isVisible={isVisible} onToggle={toggle} />
              </TableCell>
              {visibleColumns.map((col) => (
                <TableCell
                  key={col.key}
                  align={RIGHT_ALIGN_KEYS.has(col.key) ? "right" : undefined}
                  sortDirection={orderBy === col.key ? order : false}
                  sx={
                    !col.isCustom && col.key === "fastighet" ? { maxWidth: 160 } : undefined
                  }
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
            {visibleApartments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 2} align="center">
                  {apartments.length === 0
                    ? "Inga lediga lägenheter just nu."
                    : "Inga träffar."}
                </TableCell>
              </TableRow>
            ) : (
              visibleApartments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((apartment) => (
                <TableRow
                  key={apartment.id}
                  sx={[
                    missedRentIds.has(apartment.id)
                      ? { bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) }
                      : null,
                    apartment.hidden ? { opacity: 0.5 } : null,
                  ]}
                >
                  <TableCell padding="checkbox" />
                  {visibleColumns.map((col) => (
                    <TableCell
                      key={col.key}
                      align={RIGHT_ALIGN_KEYS.has(col.key) ? "right" : undefined}
                      sx={
                        !col.isCustom && col.key === "fastighet"
                          ? { maxWidth: 160, whiteSpace: "normal" }
                          : undefined
                      }
                    >
                      {renderCell(apartment, col)}
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                      {(apartment.status === "ledig" ||
                        apartment.status === "kontaktad") && (
                        <Tooltip title="Intresserad / kontraktsinfo">
                          <IconButton
                            aria-label="Intresserad / kontraktsinfo"
                            size="small"
                            onClick={() => openInterestDialog(apartment)}
                          >
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {keyHandoverEnabled && (
                        <>
                          <Tooltip
                            title={
                              apartment.nyckelInlamnad
                                ? "Nyckel inlämnad (klicka för att ångra)"
                                : "Markera nyckel inlämnad"
                            }
                          >
                            <IconButton
                              aria-label="Nyckel inlämnad"
                              size="small"
                              color={apartment.nyckelInlamnad ? "success" : "default"}
                              disabled={isTogglingNyckel}
                              onClick={() => toggleNyckelInlamnad(apartment)}
                            >
                              <KeyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip
                            title={
                              !apartment.nyckelInlamnad
                                ? "Nyckeln måste lämnas in innan den kan hämtas"
                                : apartment.nyckelHamtad
                                  ? "Nyckel hämtad (klicka för att ångra)"
                                  : "Markera nyckel hämtad"
                            }
                          >
                            <span>
                              <IconButton
                                aria-label="Nyckel hämtad"
                                size="small"
                                color={apartment.nyckelHamtad ? "success" : "default"}
                                disabled={isTogglingNyckel || !apartment.nyckelInlamnad}
                                onClick={() => toggleNyckelHamtad(apartment)}
                              >
                                <AssignmentTurnedInIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title={apartment.hidden ? "Visa" : "Dölj"}>
                        <IconButton
                          aria-label={apartment.hidden ? "Visa" : "Dölj"}
                          size="small"
                          disabled={isTogglingHidden}
                          onClick={() => toggleHidden(apartment)}
                        >
                          {apartment.hidden ? (
                            <VisibilityIcon fontSize="small" />
                          ) : (
                            <VisibilityOffIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <IconButton
                        aria-label="Redigera"
                        size="small"
                        onClick={() => openEditDialog(apartment)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="Ta bort"
                        size="small"
                        onClick={() => setDeletingApartment(apartment)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
        <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 1 }}>
          <ColumnVisibilityMenu columns={nationColumns} isVisible={isVisible} onToggle={toggle} />
        </Stack>
        {visibleApartments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            {apartments.length === 0 ? "Inga lediga lägenheter just nu." : "Inga träffar."}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {visibleApartments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((apartment) => (
              <Card
                key={apartment.id}
                variant="outlined"
                sx={[
                  missedRentIds.has(apartment.id)
                    ? { bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) }
                    : null,
                  apartment.hidden ? { opacity: 0.5 } : null,
                ]}
              >
                <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" sx={{ justifyContent: "flex-end", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                    {(apartment.status === "ledig" || apartment.status === "kontaktad") && (
                      <Tooltip title="Intresserad / kontraktsinfo">
                        <IconButton
                          aria-label="Intresserad / kontraktsinfo"
                          size="small"
                          onClick={() => openInterestDialog(apartment)}
                        >
                          <PersonAddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {keyHandoverEnabled && (
                      <>
                        <Tooltip
                          title={
                            apartment.nyckelInlamnad
                              ? "Nyckel inlämnad (klicka för att ångra)"
                              : "Markera nyckel inlämnad"
                          }
                        >
                          <IconButton
                            aria-label="Nyckel inlämnad"
                            size="small"
                            color={apartment.nyckelInlamnad ? "success" : "default"}
                            disabled={isTogglingNyckel}
                            onClick={() => toggleNyckelInlamnad(apartment)}
                          >
                            <KeyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            !apartment.nyckelInlamnad
                              ? "Nyckeln måste lämnas in innan den kan hämtas"
                              : apartment.nyckelHamtad
                                ? "Nyckel hämtad (klicka för att ångra)"
                                : "Markera nyckel hämtad"
                          }
                        >
                          <span>
                            <IconButton
                              aria-label="Nyckel hämtad"
                              size="small"
                              color={apartment.nyckelHamtad ? "success" : "default"}
                              disabled={isTogglingNyckel || !apartment.nyckelInlamnad}
                              onClick={() => toggleNyckelHamtad(apartment)}
                            >
                              <AssignmentTurnedInIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </>
                    )}
                    <Tooltip title={apartment.hidden ? "Visa" : "Dölj"}>
                      <IconButton
                        aria-label={apartment.hidden ? "Visa" : "Dölj"}
                        size="small"
                        disabled={isTogglingHidden}
                        onClick={() => toggleHidden(apartment)}
                      >
                        {apartment.hidden ? (
                          <VisibilityIcon fontSize="small" />
                        ) : (
                          <VisibilityOffIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                    <IconButton aria-label="Redigera" size="small" onClick={() => openEditDialog(apartment)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="Ta bort"
                      size="small"
                      onClick={() => setDeletingApartment(apartment)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 1 }}>
                    {visibleColumns.map((col) => (
                      <Box
                        key={col.key}
                        sx={{
                          minWidth: 0,
                          gridColumn: !col.isCustom && col.key === "status" ? "1 / -1" : undefined,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {col.label}
                        </Typography>
                        <Box sx={{ overflowWrap: "break-word" }}>{renderCell(apartment, col)}</Box>
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
        count={visibleApartments.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Rader per sida:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} av ${count}`}
      />

      <ApartmentExcelImport
        open={importOpen}
        fastigheter={fastighetPrefixes}
        mapping={importMapping}
        onClose={() => setImportOpen(false)}
      />

      <ApartmentFormDialog
        key={`form-${dialogKey}`}
        open={formOpen}
        apartment={editingApartment}
        fastigheter={fastigheter}
        customFieldDefs={customFieldDefs}
        visibleKeys={formVisibleKeys}
        currency={currency}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        onLookupSpecs={lookupApartmentSpecsAction}
      />

      <ApartmentInterestDialog
        key={`interest-${dialogKey}`}
        open={interestOpen}
        apartment={interestApartment}
        canSendToContract={isHusforman}
        onClose={() => setInterestOpen(false)}
        onSaveInterest={handleSaveInterest}
        onSendToContract={handleSendToContract}
        onSendEmailInfo={handleSendEmailInfo}
      />

      <Dialog
        open={!!deletingApartment}
        onClose={() => setDeletingApartment(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Ta bort lägenhet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Är du säker på att du vill ta bort lägenhet{" "}
            {deletingApartment?.lagenhetsnummer}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeletingApartment(null)}
            disabled={isDeleting}
          >
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
