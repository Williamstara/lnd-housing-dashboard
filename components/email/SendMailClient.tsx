"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SendIcon from "@mui/icons-material/Send";
import WarningIcon from "@mui/icons-material/Warning";
import { DATE_FIELDS, DATETIME_FIELDS, extractPlaceholders, formatForEmail, toLabel } from "@/lib/mail-utils";
import QuarterDateTimePicker from "./QuarterDateTimePicker";
import EmailPreview from "./EmailPreview";
import RecipientGroupPicker from "./RecipientGroupPicker";

interface Template { id: string; name: string; message: string; attachmentName: string | null }
interface FloorPlan { id: string; aptName: string }

export default function SendMailClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [recipientInput, setRecipientInput] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [useBcc, setUseBcc] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [subject, setSubject] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/mail-templates").then((r) => r.json()),
      fetch("/api/floor-plans").then((r) => r.json()),
      fetch("/api/auth/gmail").then((r) => r.json()),
    ])
      .then(([tmpl, plans, gmail]) => {
        setTemplates(tmpl as Template[]);
        setFloorPlans(plans as FloorPlan[]);
        setGmailConnected((gmail as { connected: boolean }).connected);
      })
      .catch(() => setLoadError("Kunde inte ladda mallar eller planritningar."));
  }, []);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;
  const placeholders = selectedTemplate ? extractPlaceholders(selectedTemplate.message) : [];
  const matchedPlan =
    floorPlans.find((p) => p.aptName.toLowerCase() === (variables.aptName ?? "").toLowerCase()) ?? null;

  function addRecipient(email: string) {
    const trimmed = email.trim().replace(/,$/, "");
    if (trimmed && !recipients.includes(trimmed)) {
      setRecipients((prev) => [...prev, trimmed]);
    }
    setRecipientInput("");
  }

  function removeRecipient(email: string) {
    setRecipients((prev) => prev.filter((e) => e !== email));
  }

  function handleRecipientKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && recipientInput.trim()) {
      e.preventDefault();
      addRecipient(recipientInput);
    }
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    setSubject(templates.find((t) => t.id === id)?.name ?? "");
    setVariables({});
    setSent(false);
    setSendError(null);
  }

  function setVar(key: string, value: string) {
    setVariables((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSend() {
    setSending(true);
    setSendError(null);
    setSent(false);
    const formattedVariables = Object.fromEntries(
      Object.entries(variables).map(([k, v]) => [k, formatForEmail(k, v)])
    );
    try {
      const res = await fetch("/api/send-mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipients, bcc: useBcc, subject, templateId, variables: formattedVariables }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Misslyckades att skicka e-post");
      }
      setSent(true);
      setRecipients([]);
      setRecipientInput("");
      setUseBcc(false);
      setTemplateId("");
      setSubject("");
      setVariables({});
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Misslyckades att skicka e-post");
    } finally {
      setSending(false);
    }
  }

  const canSend = recipients.length > 0 && templateId && placeholders.every((p) => !!variables[p]);

  if (loadError) return <Box sx={{ p: 4 }}><Alert severity="error">{loadError}</Alert></Box>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1000, mx: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 600 }}>Skicka e-post</Typography>

      {gmailConnected === false && (
        <Alert severity="warning" icon={<WarningIcon />} action={
          <Button color="inherit" size="small" href="/api/auth/gmail/connect">
            Anslut Gmail
          </Button>
        }>
          Gmail är inte anslutet — gå till{" "}
          <a href="/profil" style={{ color: "inherit" }}>Profil</a> för att ansluta ditt Google-konto.
        </Alert>
      )}

      {sent && (
        <Alert severity="success" icon={<CheckCircleIcon />} onClose={() => setSent(false)}>
          E-post skickad!
        </Alert>
      )}
      {sendError && <Alert severity="error" onClose={() => setSendError(null)}>{sendError}</Alert>}

      <Box sx={{ display: "flex", gap: 3, flexDirection: { xs: "column", md: "row" } }}>
        <Paper elevation={0} sx={{ flex: 1, border: 1, borderColor: "divider", borderRadius: 2, p: 3, display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Skriv</Typography>

          <Box>
            <TextField
              label="Mottagare (Enter eller komma för att lägga till)"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onKeyDown={handleRecipientKeyDown}
              onBlur={() => { if (recipientInput.trim()) addRecipient(recipientInput); }}
              fullWidth size="small"
            />
            {recipients.length > 0 && (
              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
                {recipients.map((email) => (
                  <Chip
                    key={email}
                    label={email}
                    size="small"
                    onDelete={() => removeRecipient(email)}
                  />
                ))}
              </Box>
            )}
          </Box>

          <RecipientGroupPicker
            existingRecipients={recipients}
            onAdd={(newEmails) =>
              setRecipients((prev) => [...prev, ...newEmails.filter((e) => !prev.includes(e))])
            }
          />

          <FormControlLabel
            control={
              <Switch
                checked={useBcc}
                onChange={(e) => setUseBcc(e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Dölj mottagarna för varandra (BCC)
              </Typography>
            }
          />

          <TextField
            select
            label="Mall"
            value={templateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            required fullWidth size="small"
          >
            {templates.length === 0 && <MenuItem disabled value="">Inga mallar tillgängliga</MenuItem>}
            {templates.map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Ämne"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            fullWidth size="small"
            disabled={!templateId}
          />

          {placeholders.length > 0 && (
            <>
              <Divider />
              <Typography variant="subtitle2" color="text.secondary">Mallvariabler</Typography>
              {placeholders.map((key) => {
                if (DATE_FIELDS.has(key)) {
                  return (
                    <TextField
                      key={key}
                      label={toLabel(key)}
                      type="date"
                      value={variables[key] ?? ""}
                      onChange={(e) => setVar(key, e.target.value)}
                      required fullWidth size="small"
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  );
                }
                if (DATETIME_FIELDS.has(key)) {
                  return (
                    <QuarterDateTimePicker
                      key={key}
                      label={toLabel(key)}
                      value={variables[key] ?? ""}
                      onChange={(v) => setVar(key, v)}
                      required
                    />
                  );
                }
                return (
                  <TextField
                    key={key}
                    label={toLabel(key)}
                    value={variables[key] ?? ""}
                    onChange={(e) => setVar(key, e.target.value)}
                    required fullWidth size="small"
                  />
                );
              })}
            </>
          )}

          {selectedTemplate?.attachmentName && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <AttachFileIcon fontSize="small" color="primary" />
              <Chip label={selectedTemplate.attachmentName} size="small" color="primary" variant="outlined" />
            </Box>
          )}

          {placeholders.includes("aptName") && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
              <AttachFileIcon fontSize="small" color={matchedPlan ? "success" : "disabled"} />
              {matchedPlan ? (
                <Chip label={`${matchedPlan.aptName}.pdf`} size="small" color="success" variant="outlined" />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {variables.aptName
                    ? `Ingen planritning hittades för "${variables.aptName}"`
                    : "Fyll i lägenhetsnummer för att bifoga planritning automatiskt"}
                </Typography>
              )}
            </Box>
          )}

          <Button
            variant="contained"
            startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
            onClick={handleSend}
            disabled={!canSend || sending || gmailConnected === false}
            sx={{ mt: 1, alignSelf: "flex-start" }}
          >
            {sending ? "Skickar…" : "Skicka e-post"}
          </Button>
        </Paper>

        <EmailPreview
          template={selectedTemplate}
          to={recipients}
          bcc={useBcc}
          subject={subject}
          variables={variables}
          matchedPlan={matchedPlan}
        />
      </Box>
    </Box>
  );
}
