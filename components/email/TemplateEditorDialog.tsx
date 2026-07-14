"use client";

import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";

const VARIABLES = [
  { token: "{{aptName}}", label: "Lägenhetsnummer" },
  { token: "{{moveInDate}}", label: "Inflyttningsdatum" },
  { token: "{{price}}", label: "Pris / månad" },
  { token: "{{latestReply}}", label: "Senaste svar" },
];

interface MailTemplate { id: string; name: string; message: string; attachmentName: string | null }

interface Props {
  open: boolean;
  editingTemplate: MailTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TemplateEditorDialog({ open, editingTemplate, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [customVar, setCustomVar] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(editingTemplate?.name ?? "");
      setMessage(editingTemplate?.message ?? "");
      setCustomVar("");
      setAttachedFile(null);
      setRemoveAttachment(false);
      setError(null);
    }
  }, [open, editingTemplate]);

  function insertToken(token: string) {
    const el = textareaRef.current;
    if (!el) { setMessage((m) => m + token); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = message.slice(0, start) + token + message.slice(end);
    setMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function handleSave() {
    if (!name.trim() || !message.trim()) return;
    setLoading(true);
    setError(null);
    try {
      let templateId: string;

      if (editingTemplate) {
        const res = await fetch(`/api/mail-templates/${editingTemplate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, message }),
        });
        if (!res.ok) throw new Error();
        templateId = editingTemplate.id;
      } else {
        const res = await fetch("/api/mail-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, message }),
        });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { id: string };
        templateId = data.id;
      }

      if (removeAttachment && !attachedFile) {
        await fetch(`/api/mail-templates/${templateId}/attachment`, { method: "DELETE" });
      }

      if (attachedFile) {
        const fd = new FormData();
        fd.append("file", attachedFile);
        const res = await fetch(`/api/mail-templates/${templateId}/attachment`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) throw new Error("Kunde inte ladda upp bifogad fil.");
      }

      onClose();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : editingTemplate ? "Kunde inte uppdatera mallen." : "Kunde inte skapa mallen.");
    } finally {
      setLoading(false);
    }
  }

  const currentAttachmentName = removeAttachment ? null : (attachedFile?.name ?? editingTemplate?.attachmentName ?? null);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editingTemplate ? "Redigera mall" : "Ny mall"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
        {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
        <TextField
          label="Mallnamn"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
        />
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
            Infoga variabel
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {VARIABLES.map(({ token, label }) => (
              <Chip key={token} label={label} size="small" onClick={() => insertToken(token)} variant="outlined" />
            ))}
          </Box>
          <Divider sx={{ my: 1.5 }} />
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
            Anpassad variabel
          </Typography>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="mittVärde"
              value={customVar}
              onChange={(e) => setCustomVar(e.target.value.replace(/[\s{}]/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customVar.trim()) {
                  e.preventDefault();
                  insertToken(`{{${customVar.trim()}}}`);
                  setCustomVar("");
                }
              }}
              sx={{ width: 200 }}
              slotProps={{ input: { style: { fontFamily: "monospace" } } }}
            />
            <Button
              size="small"
              variant="outlined"
              disabled={!customVar.trim()}
              onClick={() => {
                insertToken(`{{${customVar.trim()}}}`);
                setCustomVar("");
              }}
            >
              Infoga
            </Button>
            <Typography variant="caption" color="text.secondary">
              {customVar.trim() ? `→ {{${customVar.trim()}}}` : ""}
            </Typography>
          </Box>
        </Box>
        <TextField
          label="Meddelande"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          fullWidth multiline rows={10}
          inputRef={textareaRef}
        />

        <Divider />

        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            Fast bilaga (PDF)
          </Typography>
          {currentAttachmentName ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip
                icon={<AttachFileIcon />}
                label={currentAttachmentName}
                size="small"
                color="primary"
                variant="outlined"
                onDelete={() => {
                  if (attachedFile) {
                    setAttachedFile(null);
                  } else {
                    setRemoveAttachment(true);
                  }
                }}
                deleteIcon={<DeleteIcon />}
              />
              <Button size="small" variant="text" onClick={() => fileInputRef.current?.click()}>
                Byt fil
              </Button>
            </Box>
          ) : (
            <Button
              size="small"
              variant="outlined"
              startIcon={<AttachFileIcon />}
              onClick={() => fileInputRef.current?.click()}
            >
              Bifoga PDF
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setAttachedFile(file);
                setRemoveAttachment(false);
              }
              e.target.value = "";
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
            Bifogas automatiskt varje gång denna mall används.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Avbryt</Button>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          {editingTemplate ? "Uppdatera" : "Spara"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
