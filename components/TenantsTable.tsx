"use client";

import { useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
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
  createTenantAction,
  deleteTenantAction,
  updateTenantAction,
} from "@/app/hyresgastlista/actions";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import {
  FEATURES,
  isFeatureEnabled,
  type FastighetAlias,
  type ImportFieldConfig,
  type TableColumnConfig,
} from "@/lib/table-columns";
import type { Tenant, TenantInput } from "@/lib/tenants";
import ColumnVisibilityMenu from "@/components/ColumnVisibilityMenu";
import LaundryAccountDialog from "@/components/LaundryAccountDialog";
import TenantFormDialog from "@/components/TenantFormDialog";
import { useColumnVisibility } from "@/lib/use-column-visibility";

const ExcelImportDialog = dynamic(() => import("@/components/ExcelImportDialog"), { ssr: false });

type Props = {
  tenants: Tenant[];
  fastigheter: string[];
  aliases: FastighetAlias[];
  importMapping: ImportFieldConfig[];
  enabledFeatures?: string[];
  columnSettings: TableColumnConfig[];
};

type Order = "asc" | "desc";

function matchesSearch(tenant: Tenant, query: string): boolean {
  if (!query) return true;
  const haystack = [
    tenant.lagenhetsnummer,
    tenant.fastighet,
    tenant.namn,
    tenant.personnummer,
    tenant.mejladress,
    tenant.telefonnummer,
  ]
    .join(" ")
    .toLocaleLowerCase("sv");
  return haystack.includes(query);
}

export default function TenantsTable({
  tenants,
  fastigheter,
  aliases,
  importMapping,
  enabledFeatures,
  columnSettings,
}: Props) {
  const laundryEnabled = isFeatureEnabled(enabledFeatures, FEATURES.LAUNDRY_ACCOUNTS);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);
  const [laundryTenant, setLaundryTenant] = useState<Tenant | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  // Bumped on every open so TenantFormDialog remounts with fresh form state
  // instead of syncing props via an effect.
  const [dialogKey, setDialogKey] = useState(0);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<keyof Tenant>("fastighet");
  const [order, setOrder] = useState<Order>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { isVisible, toggle } = useColumnVisibility("tenants");
  const nationColumns = useMemo(() => columnSettings.filter((c) => c.visible), [columnSettings]);
  const visibleColumnDefs = nationColumns.filter((c) => isVisible(c.key));

  const visibleTenants = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sv");
    const filtered = tenants.filter((tenant) => matchesSearch(tenant, query));
    const direction = order === "asc" ? 1 : -1;
    return filtered.sort(
      (a, b) =>
        direction * a[orderBy].localeCompare(b[orderBy], "sv", { sensitivity: "base" })
    );
  }, [tenants, search, orderBy, order]);

  function handleSort(column: keyof Tenant) {
    if (orderBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(column);
      setOrder("asc");
    }
    setPage(0);
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

  function handleExport() {
    exportRowsToXlsx(
      `hyresgastlista-${new Date().toISOString().slice(0, 10)}.xlsx`,
      nationColumns.map((c) => c.label),
      visibleTenants.map((tenant) => nationColumns.map((c) => tenant[c.key as keyof Tenant]))
    );
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Hyresgästlista
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
            Lägg till hyresgäst
          </Button>
        </Stack>
      </Stack>

      <TextField
        label="Sök"
        placeholder="Sök hyresgäster..."
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
          aria-label="Hyresgästlista"
          size="small"
          sx={{
            minWidth: 1000,
            "& .MuiTableCell-root": { px: 1.25, py: 0.75, fontSize: "0.8125rem", whiteSpace: "nowrap" },
          }}
        >
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <ColumnVisibilityMenu columns={nationColumns} isVisible={isVisible} onToggle={toggle} />
              </TableCell>
              {visibleColumnDefs.map((column) => (
                <TableCell
                  key={column.key}
                  sortDirection={orderBy === column.key ? order : false}
                >
                  <TableSortLabel
                    active={orderBy === column.key}
                    direction={orderBy === column.key ? order : "asc"}
                    onClick={() => handleSort(column.key as keyof Tenant)}
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
                <TableCell colSpan={visibleColumnDefs.length + 2} align="center">
                  {tenants.length === 0
                    ? "Inga hyresgäster hittades."
                    : "Inga träffar för sökningen."}
                </TableCell>
              </TableRow>
            ) : (
              visibleTenants.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell padding="checkbox" />
                  {visibleColumnDefs.map((column) => (
                    <TableCell key={column.key}>{tenant[column.key as keyof Tenant]}</TableCell>
                  ))}
                  <TableCell align="right">
                    {laundryEnabled && (
                      <IconButton
                        aria-label="Skapa tvättstugekonto"
                        size="small"
                        onClick={() => setLaundryTenant(tenant)}
                        title="Skapa tvättstugekonto"
                      >
                        <LocalLaundryServiceIcon fontSize="small" />
                      </IconButton>
                    )}
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
      </Box>

      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 1 }}>
          <ColumnVisibilityMenu columns={nationColumns} isVisible={isVisible} onToggle={toggle} />
        </Stack>
        {visibleTenants.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            {tenants.length === 0 ? "Inga hyresgäster hittades." : "Inga träffar för sökningen."}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {visibleTenants.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((tenant) => (
              <Card key={tenant.id} variant="outlined">
                <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" sx={{ justifyContent: "flex-end", gap: 0.5, mb: 1 }}>
                    {laundryEnabled && (
                      <IconButton
                        aria-label="Skapa tvättstugekonto"
                        size="small"
                        onClick={() => setLaundryTenant(tenant)}
                        title="Skapa tvättstugekonto"
                      >
                        <LocalLaundryServiceIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton aria-label="Redigera" size="small" onClick={() => openEditDialog(tenant)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label="Ta bort" size="small" onClick={() => setDeletingTenant(tenant)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 1 }}>
                    {visibleColumnDefs.map((column) => (
                      <Box key={column.key} sx={{ minWidth: 0 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {column.label}
                        </Typography>
                        <Box sx={{ overflowWrap: "break-word" }}>{tenant[column.key as keyof Tenant]}</Box>
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
        count={visibleTenants.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="Rader per sida:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} av ${count}`}
      />

      <ExcelImportDialog
        open={importOpen}
        fastigheter={fastigheter}
        aliases={aliases}
        mapping={importMapping}
        onClose={() => setImportOpen(false)}
      />

      <LaundryAccountDialog
        tenant={laundryTenant}
        onClose={() => setLaundryTenant(null)}
      />

      <TenantFormDialog
        key={dialogKey}
        open={formOpen}
        tenant={editingTenant}
        fastigheter={fastigheter}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <Dialog open={!!deletingTenant} onClose={() => setDeletingTenant(null)} fullWidth maxWidth="xs">
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
