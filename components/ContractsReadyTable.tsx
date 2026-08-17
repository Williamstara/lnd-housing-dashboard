"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo, useState, useTransition, type ChangeEvent, type ReactNode } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import Alert from "@mui/material/Alert";
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
  archiveByLedigFromAction,
  markContractSentAction,
  markContractSignedAction,
  removeFromKontraktAction,
} from "@/app/lediga-lagenheter/actions";
import type { Apartment } from "@/lib/apartments";
import ColumnVisibilityMenu from "@/components/ColumnVisibilityMenu";
import { exportRowsToXlsx } from "@/lib/export-xlsx";
import { ARCHIVE_ROLES, ROLES, hasAnyRole, hasRole, normalizeRoles } from "@/lib/roles";
import { useColumnVisibility } from "@/lib/use-column-visibility";

type Props = {
  apartments: Apartment[];
};

const currency = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });

type ColumnKey =
  | "lagenhetsnummer"
  | "fastighet"
  | "storlek"
  | "objekttyp"
  | "antalRum"
  | "ledigFrom"
  | "arshyra"
  | "hyresrabatt"
  | "hyresreduktion"
  | "arshyraMedRed"
  | "manadshyra"
  | "hyresgastNamn"
  | "personnummer"
  | "epost"
  | "telefonnummer"
  | "kontonummer"
  | "klartFranHusfmDatum"
  | "kontraktSkickatDatum"
  | "kontraktSigneratDatum";

type Order = "asc" | "desc";

const columns: Array<{ key: ColumnKey; label: string; align?: "right" }> = [
  { key: "lagenhetsnummer", label: "Lägenhetsnummer" },
  { key: "fastighet", label: "Fastighet" },
  { key: "storlek", label: "Storlek" },
  { key: "objekttyp", label: "Objekttyp" },
  { key: "antalRum", label: "Antal rum", align: "right" },
  { key: "ledigFrom", label: "Ledig fr.o.m." },
  { key: "arshyra", label: "Årshyra", align: "right" },
  { key: "hyresrabatt", label: "Hyresrabatt", align: "right" },
  { key: "hyresreduktion", label: "Hyresreduktion", align: "right" },
  { key: "arshyraMedRed", label: "Årshyra med red.", align: "right" },
  { key: "manadshyra", label: "Månadshyra", align: "right" },
  { key: "hyresgastNamn", label: "Hyresgäst namn" },
  { key: "personnummer", label: "Personnummer" },
  { key: "epost", label: "E-post" },
  { key: "telefonnummer", label: "Telefonnummer" },
  { key: "kontonummer", label: "Kontonummer" },
  { key: "klartFranHusfmDatum", label: "Klart från HusFM" },
  { key: "kontraktSkickatDatum", label: "Kontrakt skickat" },
  { key: "kontraktSigneratDatum", label: "Kontrakt signerat" },
];

const columnValue: Record<ColumnKey, (a: Apartment) => string | number> = {
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
  hyresgastNamn: (a) => a.hyresgastNamn ?? "",
  personnummer: (a) => a.personnummer ?? "",
  epost: (a) => a.epost ?? "",
  telefonnummer: (a) => a.telefonnummer ?? "",
  kontonummer: (a) => a.kontonummer ?? "",
  klartFranHusfmDatum: (a) => a.klartFranHusfmDatum ?? "",
  kontraktSkickatDatum: (a) => a.kontraktSkickatDatum ?? "",
  kontraktSigneratDatum: (a) => a.kontraktSigneratDatum ?? "",
};

const CURRENCY_KEYS = new Set<ColumnKey>([
  "arshyra",
  "hyresrabatt",
  "hyresreduktion",
  "arshyraMedRed",
  "manadshyra",
]);

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
    apartment.hyresgastNamn,
    apartment.personnummer,
    apartment.epost,
    apartment.telefonnummer,
    apartment.kontonummer,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("sv");
  return haystack.includes(query);
}

export default function ContractsReadyTable({ apartments }: Props) {
  const { sessionClaims } = useAuth();
  const roles = normalizeRoles(sessionClaims?.roles);
  const isEkonomi = hasRole(roles, ROLES.EKONOMI);
  const isHusforman = hasRole(roles, ROLES.HUSFORMAN);
  const canArchive = hasAnyRole(roles, ARCHIVE_ROLES);

  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColumnKey>("ledigFrom");
  const [order, setOrder] = useState<Order>("asc");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [archiveDate, setArchiveDate] = useState("");
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);
  const [isArchiving, startArchiveTransition] = useTransition();

  const [removingApartment, setRemovingApartment] = useState<Apartment | null>(
    null
  );
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isRemoving, startRemoveTransition] = useTransition();
  const { isVisible, toggle } = useColumnVisibility("redo-for-kontrakt");
  const visibleColumnDefs = columns.filter((c) => isVisible(c.key));

  const visibleApartments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("sv");
    const filtered = apartments.filter((a) => matchesSearch(a, query));
    const direction = order === "asc" ? 1 : -1;
    const getValue = columnValue[orderBy];
    return filtered.sort(
      (a, b) => direction * compareValues(getValue(a), getValue(b))
    );
  }, [apartments, search, orderBy, order]);

  function handleSort(column: ColumnKey) {
    if (orderBy === column) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrderBy(column);
      setOrder("asc");
    }
    setPage(0);
  }

  function sendContract(id: string) {
    startTransition(async () => {
      await markContractSentAction(id);
    });
  }

  function signContract(id: string) {
    startTransition(async () => {
      await markContractSignedAction(id);
    });
  }

  function archiveByDate() {
    if (!archiveDate) return;
    startArchiveTransition(async () => {
      const { archived, skipped } = await archiveByLedigFromAction(archiveDate);
      const skippedNote =
        skipped > 0
          ? ` ${skipped} lägenhet${skipped === 1 ? "" : "er"} med samma flyttdatum väntar fortfarande på signering och lämnades kvar.`
          : "";
      setArchiveMessage(
        archived === 0 && skipped === 0
          ? `Inga lägenheter med flyttdatum ${archiveDate} hittades.`
          : `${archived} lägenhet${archived === 1 ? "" : "er"} med flyttdatum ${archiveDate} arkiverades.${skippedNote}`
      );
    });
  }

  function confirmRemove() {
    if (!removingApartment) return;
    const id = removingApartment.id;
    startRemoveTransition(async () => {
      try {
        await removeFromKontraktAction(id);
        setRemovingApartment(null);
        setRemoveError(null);
      } catch (error) {
        setRemoveError(
          error instanceof Error ? error.message : "Något gick fel. Försök igen."
        );
      }
    });
  }

  function renderCellValue(apartment: Apartment, key: ColumnKey): ReactNode {
    if (CURRENCY_KEYS.has(key)) {
      return currency.format(columnValue[key](apartment) as number);
    }
    if (key === "kontraktSkickatDatum") {
      return apartment.kontraktSkickatDatum ? (
        <>
          {apartment.kontraktSkickatDatum}
          {apartment.kontraktSkickatAv && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              av {apartment.kontraktSkickatAv}
            </Typography>
          )}
        </>
      ) : isEkonomi ? (
        <Button
          size="small"
          variant="outlined"
          disabled={isPending}
          onClick={() => sendContract(apartment.id)}
        >
          Kontrakt skickat
        </Button>
      ) : (
        "Ej skickat"
      );
    }
    if (key === "kontraktSigneratDatum") {
      return apartment.kontraktSigneratDatum ? (
        <>
          {apartment.kontraktSigneratDatum}
          {apartment.kontraktSigneratAv && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              av {apartment.kontraktSigneratAv}
            </Typography>
          )}
        </>
      ) : isEkonomi ? (
        <Button
          size="small"
          variant="contained"
          disabled={isPending || !apartment.kontraktSkickatDatum}
          onClick={() => signContract(apartment.id)}
        >
          Kontrakt signerat
        </Button>
      ) : (
        "Ej signerat"
      );
    }
    return columnValue[key](apartment);
  }

  function handleExport() {
    exportRowsToXlsx(
      `redo-for-kontrakt-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [...columns.map((c) => c.label), "Kontrakt skickat av", "Kontrakt signerat av"],
      visibleApartments.map((apartment) => [
        ...columns.map((c) => columnValue[c.key](apartment)),
        apartment.kontraktSkickatAv ?? "",
        apartment.kontraktSigneratAv ?? "",
      ])
    );
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Redo för kontrakt
        </Typography>
        <Stack direction="row" sx={{ gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExport}
          >
            Exportera
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction="row"
        sx={{ alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}
      >
        <TextField
          label="Sök"
          placeholder="Sök..."
          value={search}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          size="small"
          sx={{ maxWidth: 320 }}
          fullWidth
        />
        {canArchive && (
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <TextField
              label="Arkivera allt med flyttdatum"
              type="date"
              size="small"
              value={archiveDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setArchiveDate(event.target.value)
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button
              variant="outlined"
              disabled={!archiveDate || isArchiving}
              onClick={archiveByDate}
            >
              Arkivera
            </Button>
          </Stack>
        )}
      </Stack>

      {archiveMessage && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          onClose={() => setArchiveMessage(null)}
        >
          {archiveMessage}
        </Alert>
      )}

      <Box sx={{ display: { xs: "none", sm: "block" } }}>
      <TableContainer component={Paper}>
        <Table aria-label="Redo för kontrakt" size="small">
          <TableHead>
            <TableRow>
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
              {isHusforman && <TableCell align="right">Åtgärder</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleApartments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleColumnDefs.length + (isHusforman ? 1 : 0) + 1}
                  align="center"
                >
                  {apartments.length === 0
                    ? "Inga lägenheter är redo för kontrakt just nu."
                    : "Inga träffar."}
                </TableCell>
              </TableRow>
            ) : (
              visibleApartments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((apartment) => (
                <TableRow key={apartment.id}>
                  <TableCell padding="checkbox" />
                  {visibleColumnDefs.map((column) => (
                    <TableCell key={column.key} align={column.align}>
                      {renderCellValue(apartment, column.key)}
                    </TableCell>
                  ))}
                  {isHusforman && (
                    <TableCell align="right">
                      <Tooltip
                        title={
                          apartment.kontraktSigneratDatum
                            ? "Kontraktet är signerat och kan inte tas bort härifrån"
                            : "Ta bort från Redo för kontrakt (lägger tillbaka som ledig)"
                        }
                      >
                        <span>
                          <IconButton
                            aria-label="Ta bort från Redo för kontrakt"
                            size="small"
                            disabled={!!apartment.kontraktSigneratDatum}
                            onClick={() => {
                              setRemoveError(null);
                              setRemovingApartment(apartment);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  )}
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
        {visibleApartments.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            {apartments.length === 0 ? "Inga lägenheter är redo för kontrakt just nu." : "Inga träffar."}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {visibleApartments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((apartment) => (
              <Card key={apartment.id} variant="outlined">
                <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                  {isHusforman && (
                    <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 1 }}>
                      <Tooltip
                        title={
                          apartment.kontraktSigneratDatum
                            ? "Kontraktet är signerat och kan inte tas bort härifrån"
                            : "Ta bort från Redo för kontrakt (lägger tillbaka som ledig)"
                        }
                      >
                        <span>
                          <IconButton
                            aria-label="Ta bort från Redo för kontrakt"
                            size="small"
                            disabled={!!apartment.kontraktSigneratDatum}
                            onClick={() => {
                              setRemoveError(null);
                              setRemovingApartment(apartment);
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  )}
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 1 }}>
                    {visibleColumnDefs.map((column) => (
                      <Box
                        key={column.key}
                        sx={{
                          minWidth: 0,
                          gridColumn:
                            column.key === "kontraktSkickatDatum" || column.key === "kontraktSigneratDatum"
                              ? "1 / -1"
                              : undefined,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                          {column.label}
                        </Typography>
                        <Box sx={{ overflowWrap: "break-word" }}>{renderCellValue(apartment, column.key)}</Box>
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

      <Dialog
        open={!!removingApartment}
        onClose={() => setRemovingApartment(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Ta bort från Redo för kontrakt</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Är du säker på att du vill ta bort lägenhet{" "}
            {removingApartment?.lagenhetsnummer} från Redo för kontrakt?
            Hyresgäst- och kontraktsuppgifter rensas och lägenheten läggs
            tillbaka som ledig.
          </DialogContentText>
          {removeError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {removeError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRemovingApartment(null)}
            disabled={isRemoving}
          >
            Avbryt
          </Button>
          <Button
            onClick={confirmRemove}
            color="error"
            variant="contained"
            disabled={isRemoving}
          >
            Ta bort
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
