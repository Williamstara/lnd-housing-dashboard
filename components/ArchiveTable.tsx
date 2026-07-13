"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { addToHyresgastlistaAction } from "@/app/arkiv/actions";
import type { Apartment } from "@/lib/apartments";

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

export default function ArchiveTable({ apartments }: Props) {
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<ColumnKey>("kontraktSigneratDatum");
  const [order, setOrder] = useState<Order>("desc");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  function addToHyresgastlista(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await addToHyresgastlistaAction(id);
      } catch {
        setError("Något gick fel. Försök igen.");
      }
    });
  }

  return (
    <>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Arkiv
      </Typography>

      <TextField
        placeholder="Sök i arkivet..."
        value={search}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setSearch(event.target.value)
        }
        size="small"
        sx={{ mb: 2, maxWidth: 360 }}
        fullWidth
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table aria-label="Arkiv" size="small">
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
            {visibleApartments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center">
                  {apartments.length === 0
                    ? "Inga signerade kontrakt i arkivet ännu."
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
                  <TableCell>{apartment.kontraktSkickatDatum}</TableCell>
                  <TableCell>{apartment.kontraktSigneratDatum}</TableCell>
                  <TableCell align="right">
                    {apartment.tillagdIHyresgastlistaDatum ? (
                      <Chip
                        label={`Tillagd ${apartment.tillagdIHyresgastlistaDatum}`}
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={isPending}
                        onClick={() => addToHyresgastlista(apartment.id)}
                      >
                        Lägg till i hyresgästlista
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
}
