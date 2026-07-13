"use client";

import { useState, useTransition, type ChangeEvent, type SyntheticEvent } from "react";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { Tenant } from "@/lib/tenants";

function tenantLabel(tenant: Tenant): string {
  return `${tenant.lagenhetsnummer} — ${tenant.namn} (${tenant.fastighet})`;
}

type Props = {
  open: boolean;
  tenants: Tenant[];
  onClose: () => void;
  onSubmit: (lagenhetsnummer: string, flyttdatum: string) => Promise<void>;
};

export default function ConfirmUppsagningDialog({
  open,
  tenants,
  onClose,
  onSubmit,
}: Props) {
  const [lagenhetsnummer, setLagenhetsnummer] = useState("");
  const [flyttdatum, setFlyttdatum] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!lagenhetsnummer || !flyttdatum) {
      setError("Alla fält måste fyllas i.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await onSubmit(lagenhetsnummer, flyttdatum);
        onClose();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Något gick fel. Försök igen."
        );
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Bekräfta uppsägning</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <DialogContentText>
            Lägenheten läggs till i lediga lägenheter med det nya
            inflyttningsdatumet.
          </DialogContentText>
          {error && <Alert severity="error">{error}</Alert>}
          <Autocomplete
            options={tenants}
            getOptionLabel={tenantLabel}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={
              tenants.find((t) => t.lagenhetsnummer === lagenhetsnummer) ?? null
            }
            onChange={(_event: SyntheticEvent, newValue: Tenant | null) =>
              setLagenhetsnummer(newValue?.lagenhetsnummer ?? "")
            }
            disabled={isPending}
            renderInput={(params) => <TextField {...params} label="Lägenhet" />}
            fullWidth
          />
          <TextField
            label="Ledig fr.o.m. (ny hyresgäst)"
            type="date"
            value={flyttdatum}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setFlyttdatum(event.target.value)
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
          Bekräfta
        </Button>
      </DialogActions>
    </Dialog>
  );
}
