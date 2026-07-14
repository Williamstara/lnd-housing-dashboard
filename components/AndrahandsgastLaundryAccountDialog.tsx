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
import { createAndrahandsgastLaundryAccountAction } from "@/app/hyresgastlista/actions";
import type { Andrahandsgast } from "@/lib/andrahandsgaster";

type Props = {
  andrahandsgast: Andrahandsgast | null;
  onClose: () => void;
};

export default function AndrahandsgastLaundryAccountDialog({ andrahandsgast, onClose }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [replaced, setReplaced] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const laundryLagenhetsnummer = andrahandsgast ? `${andrahandsgast.lagenhetsnummer}b` : "";

  function handleClose() {
    setError(null);
    setSuccess(false);
    setReplaced(false);
    onClose();
  }

  function handleCreate() {
    if (!andrahandsgast) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await createAndrahandsgastLaundryAccountAction({
          namn: andrahandsgast.namn,
          mejladress: andrahandsgast.mejladress,
          telefonnummer: andrahandsgast.telefonnummer,
          fastighet: andrahandsgast.fastighet,
          lagenhetsnummer: andrahandsgast.lagenhetsnummer,
        });
        setReplaced(result.replaced);
        setSuccess(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Något gick fel.");
      }
    });
  }

  return (
    <Dialog open={!!andrahandsgast} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Skapa tvättstugekonto</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {success ? (
            <Alert severity="success">
              {replaced
                ? "Gammalt konto borttaget och nytt konto skapat!"
                : "Konto skapat!"}{" "}
              Andrahandsgästen loggar in med lösenordet{" "}
              <strong>{andrahandsgast?.lagenhetsnummer.replace(/\D/g, "")}</strong>.
            </Alert>
          ) : (
            <>
              {error && <Alert severity="error">{error}</Alert>}
              <Typography variant="body2">
                Skapar ett tvättstugekonto för:
              </Typography>
              <Stack spacing={0.5}>
                <Typography variant="body2">
                  <strong>Namn:</strong> {andrahandsgast?.namn}
                </Typography>
                <Typography variant="body2">
                  <strong>Mejl:</strong> {andrahandsgast?.mejladress || <em>saknas</em>}
                </Typography>
                <Typography variant="body2">
                  <strong>Telefon:</strong> {andrahandsgast?.telefonnummer || "—"}
                </Typography>
                <Typography variant="body2">
                  <strong>Lägenhet:</strong> {laundryLagenhetsnummer} · {andrahandsgast?.fastighet}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Lösenord: <strong>{andrahandsgast?.lagenhetsnummer.replace(/\D/g, "")}</strong>.
                Lägenheten registreras som <strong>{laundryLagenhetsnummer}</strong> så
                kontot inte krockar med huvudhyresgästens. Om ett gammalt konto
                för andrahandsgästen finns ersätts det.
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
              disabled={isPending || !andrahandsgast?.mejladress}
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
