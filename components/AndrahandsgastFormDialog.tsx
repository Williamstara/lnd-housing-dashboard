"use client";

import { useState, useTransition, type ChangeEvent } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { Andrahandsgast, AndrahandsgastInput } from "@/lib/andrahandsgaster";

const emptyForm: AndrahandsgastInput = {
  typ: "andrahandsgast",
  lagenhetsnummer: "",
  fastighet: "",
  namn: "",
  personnummer: "",
  mejladress: "",
  telefonnummer: "",
};

type Props = {
  open: boolean;
  andrahandsgast: Andrahandsgast | null;
  fastigheter: string[];
  onClose: () => void;
  onSubmit: (input: AndrahandsgastInput) => Promise<void>;
};

export default function AndrahandsgastFormDialog({
  open,
  andrahandsgast,
  fastigheter,
  onClose,
  onSubmit,
}: Props) {
  const fields: Array<{
    key: keyof AndrahandsgastInput;
    label: string;
    type?: string;
    options?: readonly string[];
  }> = [
    { key: "typ", label: "Boendeform", options: ["andrahandsgast", "inneboende"] },
    { key: "lagenhetsnummer", label: "Lägenhetsnummer" },
    { key: "fastighet", label: "Fastighet", options: fastigheter },
    { key: "namn", label: "Namn" },
    { key: "personnummer", label: "Personnummer" },
    { key: "mejladress", label: "Mejladress", type: "email" },
    { key: "telefonnummer", label: "Telefonnummer", type: "tel" },
  ];
  // The parent remounts this component (via a `key`) each time it opens for
  // a new row/create action, so the form can simply initialize from props
  // instead of syncing via an effect.
  const [form, setForm] = useState<AndrahandsgastInput>(() =>
    andrahandsgast
      ? {
          typ: andrahandsgast.typ,
          lagenhetsnummer: andrahandsgast.lagenhetsnummer,
          fastighet: andrahandsgast.fastighet,
          namn: andrahandsgast.namn,
          personnummer: andrahandsgast.personnummer,
          mejladress: andrahandsgast.mejladress,
          telefonnummer: andrahandsgast.telefonnummer,
        }
      : emptyForm
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(field: keyof AndrahandsgastInput) {
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
        await onSubmit(form);
        onClose();
      } catch {
        setError("Något gick fel. Försök igen.");
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {andrahandsgast ? "Redigera boende" : "Lägg till boende"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {fields.map(({ key, label, type, options }) => (
            <TextField
              key={key}
              select={!!options}
              label={label}
              type={type ?? "text"}
              value={form[key]}
              onChange={handleChange(key)}
              disabled={isPending}
              fullWidth
            >
              {options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {key === "typ"
                    ? option === "inneboende"
                      ? "Inneboende"
                      : "Andrahandsgäst"
                    : option}
                </MenuItem>
              ))}
            </TextField>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Avbryt
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isPending}>
          {andrahandsgast ? "Spara" : "Lägg till"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
