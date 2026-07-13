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
import type { Apartment, ContactInput } from "@/lib/apartments";

type Props = {
  open: boolean;
  apartment: Apartment | null;
  onClose: () => void;
  onSubmit: (input: ContactInput) => Promise<void>;
};

export default function ContactDialog({
  open,
  apartment,
  onClose,
  onSubmit,
}: Props) {
  const [kontaktperson, setKontaktperson] = useState("");
  const [svarSenast, setSvarSenast] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!kontaktperson.trim() || !svarSenast.trim()) {
      setError("Alla fält måste fyllas i.");
      return;
    }
    if (!apartment) return;

    setError(null);
    startTransition(async () => {
      try {
        await onSubmit({ kontaktperson, svarSenast });
        onClose();
      } catch {
        setError("Något gick fel. Försök igen.");
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Markera som kontaktad</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {apartment && (
            <DialogContentText>
              Lägenhet {apartment.lagenhetsnummer}
            </DialogContentText>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Namn på kontaktad person"
            value={kontaktperson}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setKontaktperson(event.target.value)
            }
            disabled={isPending}
            fullWidth
          />
          <TextField
            label="Svar senast"
            type="date"
            value={svarSenast}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setSvarSenast(event.target.value)
            }
            disabled={isPending}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>
          Avbryt
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isPending}>
          Spara
        </Button>
      </DialogActions>
    </Dialog>
  );
}
