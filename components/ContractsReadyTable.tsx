"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import Alert from "@mui/material/Alert";
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
import { ROLES, hasRole } from "@/lib/roles";

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
  | "hyresreduktion"
  | "arshyraMedRed"
  | "manadshyra"
  | "hyresgastNamn"
  | "personnummer"
  | "epost"
  | "telefonnummer"
  | "kontonummer"
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
  { key: "hyresreduktion", label: "Hyresreduktion", align: "right" },
  { key: "arshyraMedRed", label: "Årshyra med red.", align: "right" },
  { key: "manadshyra", label: "Månadshyra", align: "right" },
  { key: "hyresgastNamn", label: "Hyresgäst namn" },
  { key: "personnummer", label: "Personnummer" },
  { key: "epost", label: "E-post" },
  { key: "telefonnummer", label: "Telefonnummer" },
  { key: "kontonummer", label: "Kontonummer" },
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
  hyresreduktion: (a) => a.hyresreduktion,
  arshyraMedRed: (a) => a.arshyraMedRed,
  manadshyra: (a) => a.manadshyra,
  hyresgastNamn: (a) => a.hyresgastNamn ?? "",
  personnummer: (a) => a.personnummer ?? "",
  epost: (a) => a.epost ?? "",
  telefonnummer: (a) => a.telefonnummer ?? "",
  kontonummer: (a) => a.kontonummer ?? "",
  kontraktSkickatDatum: (a) => a.kontraktSkickatDatum ?? "",
  kontraktSigneratDatum: (a) => a.kontraktSigneratDatum ?? "",
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
  const { user } = useUser();
  const isEkonomi = hasRole(user, ROLES.EKONOMI);
  const isAdmin = hasRole(user, ROLES.ADMIN);

  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColumnKey>("ledigFrom");
  const [order, setOrder] = useState<Order>("asc");

  const [archiveDate, setArchiveDate] = useState("");
  const [archiveMessage, setArchiveMessage] = useState<string | null>(null);
  const [isArchiving, startArchiveTransition] = useTransition();

  const [removingApartment, setRemovingApartment] = useState<Apartment | null>(
    null
  );
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isRemoving, startRemoveTransition] = useTransition();

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

  return (
    <>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Redo för kontrakt
      </Typography>

      <Stack
        direction="row"
        sx={{ alignItems: "center", gap: 2, mb: 2, flexWrap: "wrap" }}
      >
        <TextField
          placeholder="Sök..."
          value={search}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setSearch(event.target.value)
          }
          size="small"
          sx={{ maxWidth: 320 }}
          fullWidth
        />
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

      <TableContainer component={Paper}>
        <Table aria-label="Redo för kontrakt" size="small">
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
              {isAdmin && <TableCell align="right">Åtgärder</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleApartments.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (isAdmin ? 1 : 0)}
                  align="center"
                >
                  {apartments.length === 0
                    ? "Inga lägenheter är redo för kontrakt just nu."
                    : "Inga träffar."}
                </TableCell>
              </TableRow>
            ) : (
              visibleApartments.map((apartment) => (
                <TableRow key={apartment.id}>
                  <TableCell>{apartment.lagenhetsnummer}</TableCell>
                  <TableCell>{apartment.fastighet}</TableCell>
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
                  <TableCell>{apartment.hyresgastNamn}</TableCell>
                  <TableCell>{apartment.personnummer}</TableCell>
                  <TableCell>{apartment.epost}</TableCell>
                  <TableCell>{apartment.telefonnummer}</TableCell>
                  <TableCell>{apartment.kontonummer}</TableCell>
                  <TableCell>
                    {apartment.kontraktSkickatDatum ??
                      (isEkonomi ? (
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
                      ))}
                  </TableCell>
                  <TableCell>
                    {apartment.kontraktSigneratDatum ?? (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={isPending || !apartment.kontraktSkickatDatum}
                        onClick={() => signContract(apartment.id)}
                      >
                        Kontrakt signerat
                      </Button>
                    )}
                  </TableCell>
                  {isAdmin && (
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

      <Dialog
        open={!!removingApartment}
        onClose={() => setRemovingApartment(null)}
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
