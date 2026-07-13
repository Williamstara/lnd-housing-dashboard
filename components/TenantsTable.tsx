"use client";

import { useMemo, useState, useTransition } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import Button from "@mui/material/Button";
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
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  createTenantAction,
  deleteTenantAction,
  updateTenantAction,
} from "@/app/hyresgastlista/actions";
import type { Tenant, TenantInput } from "@/lib/tenants";
import TenantFormDialog from "@/components/TenantFormDialog";

type Props = {
  tenants: Tenant[];
};

type SortableColumn = Exclude<keyof Tenant, "id">;
type Order = "asc" | "desc";

const columns: Array<{ key: SortableColumn; label: string }> = [
  { key: "lagenhetsnummer", label: "Lägenhetsnummer" },
  { key: "fastighet", label: "Fastighet" },
  { key: "namn", label: "Namn" },
  { key: "mejladress", label: "Mejladress" },
  { key: "telefonnummer", label: "Telefonnummer" },
];

function matchesSearch(tenant: Tenant, query: string): boolean {
  if (!query) return true;
  const haystack = [
    tenant.lagenhetsnummer,
    tenant.fastighet,
    tenant.namn,
    tenant.mejladress,
    tenant.telefonnummer,
  ]
    .join(" ")
    .toLocaleLowerCase("sv");
  return haystack.includes(query);
}

export default function TenantsTable({ tenants }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  // Bumped on every open so TenantFormDialog remounts with fresh form state
  // instead of syncing props via an effect.
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<SortableColumn>("fastighet");
  const [order, setOrder] = useState<Order>("asc");

  const visibleTenants = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sv");
    const filtered = tenants.filter((tenant) => matchesSearch(tenant, query));
    const direction = order === "asc" ? 1 : -1;
    return filtered.sort(
      (a, b) =>
        direction * a[orderBy].localeCompare(b[orderBy], "sv", { sensitivity: "base" })
    );
  }, [tenants, search, orderBy, order]);

  function handleSort(column: SortableColumn) {
    if (orderBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(column);
      setOrder("asc");
    }
  }

  function openCreateDialog() {
    setEditingTenant(null);
    setDialogKey((key) => key + 1);
    setFormOpen(true);
  }

  function openEditDialog(tenant: Tenant) {
    setEditingTenant(tenant);
    setDialogKey((key) => key + 1);
    setFormOpen(true);
  }

  async function handleFormSubmit(input: TenantInput) {
    if (editingTenant) {
      await updateTenantAction(editingTenant.id, input);
    } else {
      await createTenantAction(input);
    }
  }

  function confirmDelete() {
    if (!deletingTenant) return;
    const id = deletingTenant.id;
    startDeleteTransition(async () => {
      await deleteTenantAction(id);
      setDeletingTenant(null);
    });
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Hyresgästlista
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDialog}
        >
          Lägg till hyresgäst
        </Button>
      </Stack>

      <TextField
        placeholder="Sök hyresgäster..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
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
        <Table aria-label="Hyresgästlista">
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
              <TableCell align="right">Åtgärder</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleTenants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {tenants.length === 0
                    ? "Inga hyresgäster hittades."
                    : "Inga träffar för sökningen."}
                </TableCell>
              </TableRow>
            ) : (
              visibleTenants.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>{tenant.lagenhetsnummer}</TableCell>
                  <TableCell>{tenant.fastighet}</TableCell>
                  <TableCell>{tenant.namn}</TableCell>
                  <TableCell>{tenant.mejladress}</TableCell>
                  <TableCell>{tenant.telefonnummer}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      aria-label="Redigera"
                      size="small"
                      onClick={() => openEditDialog(tenant)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      aria-label="Ta bort"
                      size="small"
                      onClick={() => setDeletingTenant(tenant)}
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

      <TenantFormDialog
        key={dialogKey}
        open={formOpen}
        tenant={editingTenant}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <Dialog open={!!deletingTenant} onClose={() => setDeletingTenant(null)}>
        <DialogTitle>Ta bort hyresgäst</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Är du säker på att du vill ta bort {deletingTenant?.namn}?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingTenant(null)} disabled={isDeleting}>
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
