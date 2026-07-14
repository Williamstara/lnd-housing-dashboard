"use client";

import { useEffect, useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import QuarterDateTimePicker from "@/components/email/QuarterDateTimePicker";
import type { Apartment, ContactInput } from "@/lib/apartments";

interface Template { id: string; name: string; starred: boolean }

type Props = {
  open: boolean;
  apartment: Apartment | null;
  onClose: () => void;
  onSubmit: (input: ContactInput) => Promise<void>;
};

export default function ContactDialog({ open, apartment, onClose, onSubmit }: Props) {
  const [kontaktperson, setKontaktperson] = useState("");
  const [mejladress, setMejladress] = useState("");
  const [latestReply, setLatestReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error" | "no-template" | "no-gmail">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [starredTemplate, setStarredTemplate] = useState<Template | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setKontaktperson("");
    setMejladress("");
    setLatestReply("");
    setError(null);
    setEmailStatus("idle");
    setEmailError(null);

    fetch("/api/mail-templates")
      .then((r) => r.json())
      .then((templates: Template[]) => {
        setStarredTemplate(templates.find((t) => t.starred) ?? null);
      })
      .catch(() => setStarredTemplate(null));
  }, [open]);

  function handleSubmit() {
    if (!kontaktperson.trim() || !latestReply || !mejladress.trim()) {
      setError("Alla fält måste fyllas i.");
      return;
    }
    if (!apartment) return;

    setError(null);
    startTransition(async () => {
      try {
        const svarSenast = latestReply.split("T")[0];
        await onSubmit({ kontaktperson, svarSenast });
      } catch {
        setError("Något gick fel vid sparandet. Försök igen.");
        return;
      }

      if (!starredTemplate) {
        setEmailStatus("no-template");
        return;
      }

      setEmailStatus("sending");
      try {
        const price = new Intl.NumberFormat("sv-SE").format(apartment.manadshyra) + " kr/mån";
        const res = await fetch("/api/send-mail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: [mejladress],
            subject: "",
            templateId: starredTemplate.id,
            variables: {
              aptName: apartment.lagenhetsnummer,
              moveInDate: apartment.ledigFrom,
              latestReply,
              price,
            },
          }),
        });

        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          if (data.error?.toLowerCase().includes("gmail")) {
            setEmailStatus("no-gmail");
          } else {
            setEmailStatus("error");
            setEmailError(data.error ?? "E-postutskick misslyckades.");
          }
        } else {
          setEmailStatus("sent");
        }
      } catch {
        setEmailStatus("error");
        setEmailError("E-postutskick misslyckades.");
      }
    });
  }

  const isDone = emailStatus === "sent" || emailStatus === "no-template" || emailStatus === "no-gmail" || emailStatus === "error";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Markera som kontaktad</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {apartment && (
            <DialogContentText>Lägenhet {apartment.lagenhetsnummer}</DialogContentText>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {emailStatus === "idle" || emailStatus === "sending" ? (
            <>
              <TextField
                label="Namn på kontaktad person"
                value={kontaktperson}
                onChange={(e) => setKontaktperson(e.target.value)}
                disabled={isPending}
                fullWidth
              />
              <TextField
                label="E-postadress"
                type="email"
                value={mejladress}
                onChange={(e) => setMejladress(e.target.value)}
                disabled={isPending}
                fullWidth
              />
              <Divider />
              <Typography variant="caption" color="text.secondary">
                Senaste svarsdatum och tid (används i e-postmallen)
              </Typography>
              <QuarterDateTimePicker
                label="Svar senast"
                value={latestReply}
                onChange={setLatestReply}
                required
              />
              {!starredTemplate && (
                <Alert severity="warning" icon={<WarningAmberIcon />}>
                  Ingen standardmall är markerad. Gå till{" "}
                  <a href="/mallar" style={{ color: "inherit" }}>E-postmallar</a>{" "}
                  och markera en mall med stjärnan — annars skickas ingen e-post.
                </Alert>
              )}
            </>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Alert severity="success" icon={<CheckCircleIcon />}>
                Kontakt sparad!
              </Alert>
              {emailStatus === "sent" && (
                <Alert severity="success">E-post skickad till {mejladress}.</Alert>
              )}
              {emailStatus === "no-template" && (
                <Alert severity="warning">
                  Kontakt sparad, men ingen standardmall är markerad — ingen e-post skickades.
                </Alert>
              )}
              {emailStatus === "no-gmail" && (
                <Alert severity="warning">
                  Kontakt sparad, men Gmail är inte anslutet. Gå till{" "}
                  <a href="/profil" style={{ color: "inherit" }}>Profil</a>{" "}
                  för att ansluta Gmail.
                </Alert>
              )}
              {emailStatus === "error" && (
                <Alert severity="error">
                  Kontakt sparad men e-post misslyckades: {emailError}
                </Alert>
              )}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {isDone ? (
          <Button onClick={onClose} variant="contained">Stäng</Button>
        ) : (
          <>
            <Button onClick={onClose} disabled={isPending}>Avbryt</Button>
            <Button
              onClick={handleSubmit}
              variant="contained"
              disabled={isPending}
              startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {isPending ? "Sparar…" : "Spara och skicka"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
