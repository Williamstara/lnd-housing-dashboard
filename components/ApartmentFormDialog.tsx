"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { Apartment, ApartmentInput, ApartmentSpecs } from "@/lib/apartments";

function n(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return isNaN(v) ? null : v;
}

type FormValues = {
  lagenhetsnummer: string;
  fastighet: string;
  storlek: string;
  objekttyp: string;
  antalRum: string;
  ledigFrom: string;
  arshyra: string;
  hyresrabatt: string;
  hyresreduktion: string;
  arshyraMedRed: string;
  manadshyra: string;
};

const emptyForm: FormValues = {
  lagenhetsnummer: "",
  fastighet: "",
  storlek: "",
  objekttyp: "",
  antalRum: "",
  ledigFrom: "",
  arshyra: "",
  hyresrabatt: "",
  hyresreduktion: "",
  arshyraMedRed: "",
  manadshyra: "",
};

function toFormValues(apartment: Apartment | null): FormValues {
  if (!apartment) return emptyForm;
  return {
    lagenhetsnummer: apartment.lagenhetsnummer,
    fastighet: apartment.fastighet,
    storlek: apartment.storlek,
    objekttyp: apartment.objekttyp,
    antalRum: String(apartment.antalRum),
    ledigFrom: apartment.ledigFrom,
    arshyra: String(apartment.arshyra),
    hyresrabatt: String(apartment.hyresrabatt),
    hyresreduktion: String(apartment.hyresreduktion),
    arshyraMedRed: String(apartment.arshyraMedRed),
    manadshyra: String(apartment.manadshyra),
  };
}

type Props = {
  open: boolean;
  apartment: Apartment | null;
  fastigheter: string[];
  onClose: () => void;
  onSubmit: (input: ApartmentInput) => Promise<void>;
  onLookupSpecs: (lagenhetsnummer: string) => Promise<ApartmentSpecs | null>;
};

export default function ApartmentFormDialog({
  open,
  apartment,
  fastigheter,
  onClose,
  onSubmit,
  onLookupSpecs,
}: Props) {
  const fields: Array<{
    key: keyof FormValues;
    label: string;
    type?: string;
    options?: readonly string[];
  }> = [
    { key: "fastighet", label: "Fastighet", options: fastigheter },
    { key: "storlek", label: "Storlek" },
    { key: "objekttyp", label: "Objekttyp" },
    { key: "antalRum", label: "Antal rum", type: "number" },
    { key: "ledigFrom", label: "Ledig fr.o.m.", type: "date" },
    { key: "arshyra", label: "Årshyra (kr)", type: "number" },
    { key: "hyresrabatt", label: "Hyresrabatt (kr)", type: "number" },
    { key: "hyresreduktion", label: "Hyresreduktion (kr)", type: "number" },
    { key: "arshyraMedRed", label: "Årshyra med red. (kr)", type: "number" },
    { key: "manadshyra", label: "Månadshyra (kr)", type: "number" },
  ];
  const [form, setForm] = useState<FormValues>(() => toFormValues(apartment));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);
  const [isLookingUp, startLookupTransition] = useTransition();

  function set(field: keyof FormValues, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // Keep "Årshyra med red." and "Månadshyra" in sync whenever the
      // inputs they're derived from change, mirroring RentalObjectFormDialog.
      if (field === "arshyra" || field === "hyresrabatt" || field === "hyresreduktion") {
        const arshyra = n(next.arshyra);
        if (arshyra != null) {
          const individuell =
            arshyra - Math.abs(n(next.hyresrabatt) ?? 0) - Math.abs(n(next.hyresreduktion) ?? 0);
          next.arshyraMedRed = String(Math.round(individuell));
          next.manadshyra = String(Math.round(individuell / 12));
        }
      }

      return next;
    });
  }

  function handleChange(field: keyof FormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      set(field, event.target.value);
  }

  function handleLookupSpecs() {
    const lagenhetsnummer = form.lagenhetsnummer.trim();
    if (!lagenhetsnummer) return;
    setLookupMessage(null);
    startLookupTransition(async () => {
      const specs = await onLookupSpecs(lagenhetsnummer);
      if (!specs) {
        setLookupMessage("Ingen tidigare information hittades för det lägenhetsnumret.");
        return;
      }
      setForm((prev) => ({
        ...prev,
        fastighet: specs.fastighet,
        storlek: specs.storlek,
        objekttyp: specs.objekttyp,
        antalRum: String(specs.antalRum),
        arshyra: String(specs.arshyra),
        hyresrabatt: String(specs.hyresrabatt),
        hyresreduktion: String(specs.hyresreduktion),
        arshyraMedRed: String(specs.arshyraMedRed),
        manadshyra: String(specs.manadshyra),
      }));
    });
  }

  function handleSubmit() {
    if (Object.values(form).some((value) => value.trim() === "")) {
      setError("Alla fält måste fyllas i.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await onSubmit({
          lagenhetsnummer: form.lagenhetsnummer,
          fastighet: form.fastighet,
          storlek: form.storlek,
          objekttyp: form.objekttyp,
          antalRum: Number(form.antalRum),
          ledigFrom: form.ledigFrom,
          arshyra: Number(form.arshyra),
          hyresrabatt: Number(form.hyresrabatt),
          hyresreduktion: Number(form.hyresreduktion),
          arshyraMedRed: Number(form.arshyraMedRed),
          manadshyra: Number(form.manadshyra),
        });
        onClose();
      } catch {
        setError("Något gick fel. Försök igen.");
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {apartment ? "Redigera lägenhet" : "Lägg till lägenhet"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
            <TextField
              label="Lägenhetsnummer"
              value={form.lagenhetsnummer}
              onChange={(e) => {
                handleChange("lagenhetsnummer")(e);
                setLookupMessage(null);
              }}
              disabled={isPending}
              fullWidth
            />
            {!apartment && (
              <Button
                variant="outlined"
                onClick={handleLookupSpecs}
                disabled={isPending || isLookingUp || !form.lagenhetsnummer.trim()}
                startIcon={
                  isLookingUp ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />
                }
                sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
              >
                Hämta från databas
              </Button>
            )}
          </Stack>
          {lookupMessage && <Alert severity="info">{lookupMessage}</Alert>}
          <Grid container spacing={2}>
            {fields.map(({ key, label, type, options }) => (
              <Grid key={key} size={{ xs: 12, sm: 6 }}>
                <TextField
                  select={!!options}
                  label={label}
                  type={type ?? "text"}
                  value={form[key]}
                  onChange={handleChange(key)}
                  disabled={isPending}
                  slotProps={
                    type === "date" ? { inputLabel: { shrink: true } } : undefined
                  }
                  fullWidth
                >
                  {options?.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            ))}
          </Grid>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Avbryt
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isPending}>
          {apartment ? "Spara" : "Lägg till"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
