"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { Apartment, TenantAssignmentInput } from "@/lib/apartments";

type FormValues = TenantAssignmentInput;

function toFormValues(apartment: Apartment | null): FormValues {
  return {
    hyresgastNamn: apartment?.hyresgastNamn ?? apartment?.kontaktperson ?? "",
    personnummer: apartment?.personnummer ?? "",
    epost: apartment?.epost ?? "",
    telefonnummer: apartment?.telefonnummer ?? "",
    kontonummer: apartment?.kontonummer ?? "",
  };
}

const fields: Array<{ key: keyof FormValues; label: string; type?: string }> = [
  { key: "hyresgastNamn", label: "Hyresgäst namn" },
  { key: "personnummer", label: "Personnummer" },
  { key: "epost", label: "E-post", type: "email" },
  { key: "telefonnummer", label: "Telefonnummer" },
  { key: "kontonummer", label: "Kontonummer" },
];

type Props = {
  open: boolean;
  apartment: Apartment | null;
  onClose: () => void;
  onSubmit: (input: TenantAssignmentInput) => Promise<void>;
};

export default function AssignTenantDialog({
  open,
  apartment,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormValues>(() => toFormValues(apartment));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(field: keyof FormValues) {
    return (event: ChangeEvent<HTMLInputElement>) =>
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
        await onSubmit(form);
        onClose();
      } catch {
        setError("Något gick fel. Försök igen.");
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Fyll i hyresgästinformation</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {apartment && (
            <DialogContentText>
              Lägenhet {apartment.lagenhetsnummer} — skickas till &quot;Redo
              för kontrakt&quot; när informationen är sparad.
            </DialogContentText>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          {fields.map(({ key, label, type }) => (
            <TextField
              key={key}
              label={label}
              type={type ?? "text"}
              value={form[key]}
              onChange={handleChange(key)}
              disabled={isPending}
              fullWidth
            />
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Avbryt
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isPending}>
          Skicka till Redo för kontrakt
        </Button>
      </DialogActions>
    </Dialog>
  );
}
