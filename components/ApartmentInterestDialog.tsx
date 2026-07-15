"use client";

import { useEffect, useState, useTransition, type ChangeEvent } from "react";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Alert from "@mui/material/Alert";
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import QuarterDateTimePicker from "@/components/email/QuarterDateTimePicker";
import type { Apartment, TenantAssignmentInput } from "@/lib/apartments";

interface Template { id: string; name: string; starred: boolean }

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
  { key: "hyresgastNamn", label: "Namn" },
  { key: "personnummer", label: "Personnummer" },
  { key: "epost", label: "E-post", type: "email" },
  { key: "telefonnummer", label: "Telefonnummer" },
  { key: "kontonummer", label: "Kontonummer" },
];

type Props = {
  open: boolean;
  apartment: Apartment | null;
  canSendToContract: boolean;
  onClose: () => void;
  onSaveInterest: (input: TenantAssignmentInput) => Promise<void>;
  onSendToContract: (input: TenantAssignmentInput) => Promise<void>;
  onSendEmailInfo: (input: TenantAssignmentInput, svarSenast: string) => Promise<void>;
};

export default function ApartmentInterestDialog({
  open,
  apartment,
  canSendToContract,
  onClose,
  onSaveInterest,
  onSendToContract,
  onSendEmailInfo,
}: Props) {
  const [form, setForm] = useState<FormValues>(() => toFormValues(apartment));
  const [svarSenast, setSvarSenast] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [isSaving, startSaveTransition] = useTransition();
  const [isSendingToContract, startContractTransition] = useTransition();

  const [emailStatus, setEmailStatus] = useState<
    "idle" | "sending" | "sent" | "error" | "no-template" | "no-gmail"
  >("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [starredTemplate, setStarredTemplate] = useState<Template | null>(null);

  // The parent remounts this dialog (via a key bump) on every open, so a
  // plain mount-time fetch is enough — no need to key an effect off `open`.
  useEffect(() => {
    fetch("/api/mail-templates")
      .then((r) => r.json())
      .then((templates: Template[]) => {
        setStarredTemplate(templates.find((t) => t.starred) ?? null);
      })
      .catch(() => setStarredTemplate(null));
  }, []);

  function handleChange(field: keyof FormValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setSaveStatus("idle");
    };
  }

  const isBusy = isSaving || isSendingToContract || emailStatus === "sending";
  const canSendEmail = form.epost.trim() !== "";
  const allFieldsFilled = Object.values(form).every((value) => value.trim() !== "");

  function handleSave() {
    setError(null);
    startSaveTransition(async () => {
      try {
        await onSaveInterest(form);
        setSaveStatus("saved");
        onClose();
      } catch {
        setError("Något gick fel vid sparandet. Försök igen.");
      }
    });
  }

  function handleSendToContract() {
    if (!allFieldsFilled) {
      setError("Alla fält måste fyllas i för att skicka till kontrakt.");
      return;
    }
    setError(null);
    startContractTransition(async () => {
      try {
        await onSendToContract(form);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel. Försök igen.");
      }
    });
  }

  async function handleSendEmail() {
    if (!form.hyresgastNamn.trim() || !svarSenast) {
      setError("Namn och svarsdatum måste fyllas i för att skicka mejl.");
      return;
    }
    if (!apartment) return;

    setError(null);
    try {
      await onSendEmailInfo(form, svarSenast);
    } catch {
      setError("Något gick fel vid sparandet. Försök igen.");
      return;
    }
    setSaveStatus("saved");

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
          to: [form.epost.trim()],
          subject: "",
          templateId: starredTemplate.id,
          variables: {
            aptName: apartment.lagenhetsnummer,
            moveInDate: apartment.ledigFrom,
            latestReply: svarSenast,
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
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Intresserad / kontraktsinfo</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {apartment && (
            <DialogContentText>
              Lägenhet {apartment.lagenhetsnummer}. Fyll i allt eftersom informationen
              blir tillgänglig — spara löpande, skicka mejl med svarsdatum, eller
              skicka till kontrakt när alla fält är ifyllda.
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
              disabled={isBusy}
              fullWidth
            />
          ))}

          {saveStatus === "saved" && emailStatus === "idle" && (
            <Alert severity="success" icon={<CheckCircleIcon />}>
              Sparat.
            </Alert>
          )}

          <Divider />
          <Typography variant="caption" color="text.secondary">
            Svara senast (används i e-postmallen när mejl skickas)
          </Typography>
          <QuarterDateTimePicker
            label="Svar senast"
            value={svarSenast}
            onChange={(v) => { setSvarSenast(v); setEmailStatus("idle"); }}
          />
          {!starredTemplate && (
            <Alert severity="warning" icon={<WarningAmberIcon />}>
              Ingen standardmall är markerad. Gå till{" "}
              <a href="/mallar" style={{ color: "inherit" }}>E-postmallar</a>{" "}
              och markera en mall med stjärnan — annars skickas ingen e-post.
            </Alert>
          )}

          {emailStatus === "sent" && (
            <Alert severity="success">E-post skickad till {form.epost.trim()}.</Alert>
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
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isBusy}>Stäng</Button>
        <Button onClick={handleSave} disabled={isBusy}>
          {isSaving ? "Sparar…" : "Spara"}
        </Button>
        <Tooltip title={canSendEmail ? "" : "Ange e-postadress för att kunna skicka mejl"}>
          <span>
            <Button
              onClick={handleSendEmail}
              variant="outlined"
              disabled={isBusy || !canSendEmail}
              startIcon={emailStatus === "sending" ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {emailStatus === "sending" ? "Skickar…" : "Skicka mejl"}
            </Button>
          </span>
        </Tooltip>
        <Tooltip
          title={
            !canSendToContract
              ? "Endast husförman kan skicka till kontrakt"
              : !allFieldsFilled
              ? "Alla fält måste fyllas i"
              : ""
          }
        >
          <span>
            <Button
              onClick={handleSendToContract}
              variant="contained"
              disabled={isBusy || !canSendToContract || !allFieldsFilled}
              startIcon={isSendingToContract ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {isSendingToContract ? "Skickar…" : "Skicka för kontrakt"}
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
