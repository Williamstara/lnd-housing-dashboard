"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useMemo, useState, useTransition } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import {
  assignTenantAction,
  createApartmentAction,
  deleteApartmentAction,
  markContactedAction,
  setHiddenAction,
  updateApartmentAction,
} from "@/app/lediga-lagenheter/actions";
import type {
  Apartment,
  ApartmentInput,
  ApartmentStatus,
  ContactInput,
  TenantAssignmentInput,
} from "@/lib/apartments";
import ApartmentFormDialog from "@/components/ApartmentFormDialog";
import AssignTenantDialog from "@/components/AssignTenantDialog";
import ContactDialog from "@/components/ContactDialog";
import { ROLES, hasRole } from "@/lib/roles";

type Props = {
  apartments: Apartment[];
};

const currency = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

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

type ColumnKey =
  | "lagenhetsnummer"
  | "fastighet"
  | "storlek"
  | "objekttyp"
  | "antalRum"
  | "ledigFrom"
  | "arshyra"
  | "hyresreduktion"
  | "arshyraMedRed"
  | "manadshyra"
  | "status";

type Order = "asc" | "desc";

const columns: Array<{
  key: ColumnKey;
  label: string;
  align?: "right";
}> = [
  { key: "lagenhetsnummer", label: "Bostad" },
  { key: "fastighet", label: "Fastighet" },
  { key: "storlek", label: "Storlek" },
  { key: "objekttyp", label: "Objekttyp" },
  { key: "antalRum", label: "Antal rum", align: "right" },
  { key: "ledigFrom", label: "Ledig fr.o.m." },
  { key: "arshyra", label: "Årshyra", align: "right" },
  { key: "hyresreduktion", label: "H.red", align: "right" },
  { key: "arshyraMedRed", label: "Årshyra med red.", align: "right" },
  { key: "manadshyra", label: "Månadshyra", align: "right" },
  { key: "status", label: "Status" },
];

const columnValue: Record<ColumnKey, (a: Apartment) => string | number> = {
  lagenhetsnummer: (a) => a.lagenhetsnummer,
  fastighet: (a) => a.fastighet,
  storlek: (a) => a.storlek,
  objekttyp: (a) => a.objekttyp,
  antalRum: (a) => a.antalRum,
  ledigFrom: (a) => a.ledigFrom,
  arshyra: (a) => a.arshyra,
  hyresreduktion: (a) => a.hyresreduktion,
  arshyraMedRed: (a) => a.arshyraMedRed,
  manadshyra: (a) => a.manadshyra,
  status: (a) => STATUS_LABELS[a.status],
};

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

export default function ApartmentsTable({ apartments }: Props) {
  const { user } = useUser();
  const isAdmin = hasRole(user, ROLES.ADMIN);

  const [formOpen, setFormOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(
    null
  );
  const [contactOpen, setContactOpen] = useState(false);
  const [contactApartment, setContactApartment] = useState<Apartment | null>(
    null
  );
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignApartment, setAssignApartment] = useState<Apartment | null>(
    null
  );
  const [deletingApartment, setDeletingApartment] = useState<Apartment | null>(
    null
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isTogglingHidden, startHiddenTransition] = useTransition();
  // Bumped on every dialog open so the dialogs remount with fresh state
  // instead of syncing props via an effect.
  const [dialogKey, setDialogKey] = useState(0);

  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [orderBy, setOrderBy] = useState<ColumnKey>("ledigFrom");
  const [order, setOrder] = useState<Order>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const visibleApartments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sv");
    const filtered = apartments.filter(
      (apartment) =>
        (showHidden || !apartment.hidden) && matchesSearch(apartment, query)
    );
    const direction = order === "asc" ? 1 : -1;
    const getValue = columnValue[orderBy];
    return filtered.sort(
      (a, b) => direction * compareValues(getValue(a), getValue(b))
    );
  }, [apartments, search, showHidden, orderBy, order]);

  function handleSort(column: ColumnKey) {
    if (orderBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(column);
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

  function openContactDialog(apartment: Apartment) {
    setContactApartment(apartment);
    setDialogKey((key) => key + 1);
    setContactOpen(true);
  }

  function openAssignDialog(apartment: Apartment) {
    setAssignApartment(apartment);
    setDialogKey((key) => key + 1);
    setAssignOpen(true);
  }

  async function handleFormSubmit(input: ApartmentInput) {
    if (editingApartment) {
      await updateApartmentAction(editingApartment.id, input);
    } else {
      await createApartmentAction(input);
    }
  }

  async function handleContactSubmit(input: ContactInput) {
    if (!contactApartment) return;
    await markContactedAction(contactApartment.id, input);
  }

  async function handleAssignSubmit(input: TenantAssignmentInput) {
    if (!assignApartment) return;
    await assignTenantAction(assignApartment.id, input);
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

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Lediga lägenheter
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Lägg till lägenhet
        </Button>
      </Stack>

      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 2, gap: 2, flexWrap: "wrap" }}
      >
        <TextField
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
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align}
                  sortDirection={orderBy === column.key ? order : false}
                  sx={
                    column.key === "fastighet" ? { maxWidth: 160 } : undefined
                  }
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
            {visibleApartments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  {apartments.length === 0
                    ? "Inga lediga lägenheter just nu."
                    : "Inga träffar."}
                </TableCell>
              </TableRow>
            ) : (
              visibleApartments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((apartment) => (
                <TableRow
                  key={apartment.id}
                  sx={apartment.hidden ? { opacity: 0.5 } : undefined}
                >
                  <TableCell>{apartment.lagenhetsnummer}</TableCell>
                  <TableCell sx={{ maxWidth: 160, whiteSpace: "normal" }}>
                    {apartment.fastighet}
                  </TableCell>
                  <TableCell>{apartment.storlek}</TableCell>
                  <TableCell>{apartment.objekttyp}</TableCell>
                  <TableCell align="right">{apartment.antalRum}</TableCell>
                  <TableCell>{apartment.ledigFrom}</TableCell>
                  <TableCell align="right">
                    {currency.format(apartment.arshyra)}
                  </TableCell>
                  <TableCell align="right">
                    {currency.format(apartment.hyresreduktion)}
                  </TableCell>
                  <TableCell align="right">
                    {currency.format(apartment.arshyraMedRed)}
                  </TableCell>
                  <TableCell align="right">
                    {currency.format(apartment.manadshyra)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_LABELS[apartment.status]}
                      color={STATUS_COLORS[apartment.status]}
                      size="small"
                    />
                    {apartment.hidden && (
                      <Chip label="Dold" size="small" sx={{ ml: 0.5 }} />
                    )}
                    {apartment.status === "kontaktad" && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {apartment.kontaktperson} — svar senast{" "}
                          {apartment.svarSenast}
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
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
                      {(apartment.status === "ledig" ||
                        apartment.status === "kontaktad") && (
                        <Tooltip
                          title={
                            apartment.status === "ledig"
                              ? "Markera som kontaktad"
                              : "Byt kontaktperson"
                          }
                        >
                          <IconButton
                            aria-label="Kontakta"
                            size="small"
                            onClick={() => openContactDialog(apartment)}
                          >
                            <MarkEmailReadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {apartment.status === "kontaktad" && isAdmin && (
                        <Tooltip title="Fyll i hyresgästinfo (skickar till Redo för kontrakt)">
                          <IconButton
                            aria-label="Fyll i hyresgästinfo"
                            size="small"
                            onClick={() => openAssignDialog(apartment)}
                          >
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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

      <ApartmentFormDialog
        key={`form-${dialogKey}`}
        open={formOpen}
        apartment={editingApartment}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <ContactDialog
        key={`contact-${dialogKey}`}
        open={contactOpen}
        apartment={contactApartment}
        onClose={() => setContactOpen(false)}
        onSubmit={handleContactSubmit}
      />

      <AssignTenantDialog
        key={`assign-${dialogKey}`}
        open={assignOpen}
        apartment={assignApartment}
        onClose={() => setAssignOpen(false)}
        onSubmit={handleAssignSubmit}
      />

      <Dialog
        open={!!deletingApartment}
        onClose={() => setDeletingApartment(null)}
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
