"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmailIcon from "@mui/icons-material/Email";

interface Props {
  gmailConnected: boolean;
  gmailEmail: string | null;
  gmailName: string | null;
  gmailSignature: string | null;
}

export default function ProfileGmailSection({
  gmailConnected: initConnected,
  gmailEmail: initEmail,
  gmailName: initName,
  gmailSignature: initSignature,
}: Props) {
  const [connected, setConnected] = useState(initConnected);
  const [email, setEmail] = useState(initEmail);
  const [name, setName] = useState(initName);
  const [signature, setSignature] = useState(initSignature);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/auth/gmail/sync", { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { name: string; signature: string };
        setName(data.name || null);
        setSignature(data.signature || null);
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setSyncError(data.error ?? "Synkronisering misslyckades.");
      }
    } catch {
      setSyncError("Synkronisering misslyckades.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/auth/gmail", { method: "DELETE" });
      if (res.ok) { setConnected(false); setEmail(null); setName(null); setSignature(null); }
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <EmailIcon fontSize="small" color="action" />
        <Typography variant="subtitle2">Gmail-konto</Typography>
      </Box>

      {connected ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CheckCircleIcon fontSize="small" color="success" />
              <Box>
                {name && <Typography variant="body2">{name}</Typography>}
                <Typography variant="body2" color="text.secondary">{email}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" variant="outlined" onClick={handleSync} disabled={syncing}>
                {syncing ? "Synkar…" : "Synka från Gmail"}
              </Button>
              <Button size="small" variant="outlined" color="error" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? "Kopplar från…" : "Koppla från"}
              </Button>
            </Box>
          </Box>

          {syncError && <Alert severity="error" onClose={() => setSyncError(null)}>{syncError}</Alert>}

          {signature ? (
            <Box>
              <Typography variant="caption" color="text.secondary">Signatur från Gmail</Typography>
              <Box
                sx={{ mt: 0.5, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1, fontSize: 13 }}
                dangerouslySetInnerHTML={{ __html: signature }}
              />
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Ingen signatur hittades. Sätt en i Gmail-inställningarna och klicka Synka från Gmail.
            </Typography>
          )}
        </Box>
      ) : (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Anslut ditt Google-konto för att skicka e-post från din egen adress.
          </Typography>
          <Button variant="outlined" fullWidth href="/api/auth/gmail/connect">
            Anslut Gmail
          </Button>
        </Box>
      )}
    </Paper>
  );
}
