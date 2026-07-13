"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { Apartment, ApartmentInput } from "@/lib/apartments";
import { FASTIGHETER } from "@/lib/fastigheter";

type FormValues = {
  lagenhetsnummer: string;
  fastighet: string;
  storlek: string;
  objekttyp: string;
  antalRum: string;
  ledigFrom: string;
  arshyra: string;
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
    hyresreduktion: String(apartment.hyresreduktion),
    arshyraMedRed: String(apartment.arshyraMedRed),
    manadshyra: String(apartment.manadshyra),
  };
}

const fields: Array<{
  key: keyof FormValues;
  label: string;
  type?: string;
  options?: readonly string[];
}> = [
  { key: "lagenhetsnummer", label: "Lägenhetsnummer" },
  { key: "fastighet", label: "Fastighet", options: FASTIGHETER },
  { key: "storlek", label: "Storlek" },
  { key: "objekttyp", label: "Objekttyp" },
  { key: "antalRum", label: "Antal rum", type: "number" },
  { key: "ledigFrom", label: "Ledig fr.o.m.", type: "date" },
  { key: "arshyra", label: "Årshyra (kr)", type: "number" },
  { key: "hyresreduktion", label: "Hyresreduktion (kr)", type: "number" },
  { key: "arshyraMedRed", label: "Årshyra med red. (kr)", type: "number" },
  { key: "manadshyra", label: "Månadshyra (kr)", type: "number" },
];

type Props = {
  open: boolean;
  apartment: Apartment | null;
  onClose: () => void;
  onSubmit: (input: ApartmentInput) => Promise<void>;
};

export default function ApartmentFormDialog({
  open,
  apartment,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormValues>(() => toFormValues(apartment));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(field: keyof FormValues) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
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
