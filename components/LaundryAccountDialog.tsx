"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { createLaundryAccountAction } from "@/app/hyresgastlista/actions";
import type { Tenant } from "@/lib/tenants";

type Props = {
  tenant: Tenant | null;
  onClose: () => void;
};

export default function LaundryAccountDialog({ tenant, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [replaced, setReplaced] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setError(null);
    setSuccess(false);
    setReplaced(false);
    onClose();
  }

  function handleCreate() {
    if (!tenant) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await createLaundryAccountAction({
          namn: tenant.namn,
          mejladress: tenant.mejladress,
          telefonnummer: tenant.telefonnummer,
          fastighet: tenant.fastighet,
          lagenhetsnummer: tenant.lagenhetsnummer,
        });
        setReplaced(result.replaced);
        setSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Något gick fel.");
      }
    });
  }

  return (
    <Dialog open={!!tenant} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Skapa tvättstugekonto</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {success ? (
            <Alert severity="success">
              {replaced
                ? "Gammalt konto borttaget och nytt konto skapat!"
                : "Konto skapat!"}{" "}
              Hyresgästen loggar in med lösenordet{" "}
              <strong>{tenant?.lagenhetsnummer.replace(/\D/g, "")}</strong>.
            </Alert>
          ) : (
            <>
              {error && <Alert severity="error">{error}</Alert>}
              <Typography variant="body2">
                Skapar ett tvättstugekonto för:
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <strong>Namn:</strong> {tenant?.namn}
                </Typography>
                <Typography variant="body2">
                  <strong>Mejl:</strong> {tenant?.mejladress || <em>saknas</em>}
                </Typography>
                <Typography variant="body2">
                  <strong>Telefon:</strong> {tenant?.telefonnummer || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Lägenhet:</strong> {tenant?.lagenhetsnummer} · {tenant?.fastighet}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Lösenord: <strong>{tenant?.lagenhetsnummer.replace(/\D/g, "")}</strong>. Om ett gammalt konto finns ersätts det.
              </Typography>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {success ? (
          <Button onClick={handleClose} variant="contained">
            Stäng
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={isPending}>
              Avbryt
            </Button>
            <Button
              onClick={handleCreate}
              variant="contained"
              disabled={isPending || !tenant?.mejladress}
              startIcon={
                isPending ? <CircularProgress size={16} color="inherit" /> : undefined
              }
            >
              {isPending ? "Skapar..." : "Skapa konto"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
