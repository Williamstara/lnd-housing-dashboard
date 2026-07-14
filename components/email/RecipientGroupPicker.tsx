"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

interface Props {
  onAdd: (emails: string[]) => void;
  existingRecipients: string[];
  fastigheter: string[];
}

export default function RecipientGroupPicker({ onAdd, existingRecipients, fastigheter }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const FASTIGHET_LABELS = useMemo(
    () => fastigheter.map((f) => ({ full: f, short: f.split(" (")[0] })),
    [fastigheter]
  );
  const [inflyttningDatum, setInflyttningDatum] = useState("");
  const [utflyttningDatum, setUtflyttningDatum] = useState("");
  const [lastResult, setLastResult] = useState<{ added: number; key: string } | null>(null);

  async function fetchAndAdd(url: string, key: string) {
    setLoading(key);
    setLastResult(null);
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as { recipients: { email: string }[] };
      const fresh = data.recipients
        .map((r) => r.email)
        .filter((e) => e && !existingRecipients.includes(e));
      onAdd(fresh);
      setLastResult({ added: fresh.length, key });
    } catch {
      // ignore
    } finally {
      setLoading(null);
    }
  }

  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        bgcolor: "action.hover",
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: 0.5 }}>
        LÄGG TILL GRUPP
      </Typography>

      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        <Button
          size="small"
          variant="outlined"
          disabled={!!loading}
          startIcon={loading === "all" ? <CircularProgress size={12} color="inherit" /> : null}
          onClick={() => fetchAndAdd("/api/recipient-groups?type=all", "all")}
        >
          Alla hyresgäster
        </Button>
        {FASTIGHET_LABELS.map(({ full, short }) => {
          const key = `f:${full}`;
          return (
            <Tooltip key={full} title={full} arrow>
              <Button
                size="small"
                variant="outlined"
                disabled={!!loading}
                startIcon={loading === key ? <CircularProgress size={12} color="inherit" /> : null}
                onClick={() =>
                  fetchAndAdd(
                    `/api/recipient-groups?type=fastighet&fastighet=${encodeURIComponent(full)}`,
                    key
                  )
                }
              >
                {short}
              </Button>
            </Tooltip>
          );
        })}
      </Box>

      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <TextField
          size="small"
          type="date"
          label="Inflyttning"
          value={inflyttningDatum}
          onChange={(e) => setInflyttningDatum(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 170 }}
        />
        <Button
          size="small"
          variant="outlined"
          disabled={!inflyttningDatum || !!loading}
          startIcon={loading === "inflyttning" ? <CircularProgress size={12} color="inherit" /> : null}
          onClick={() =>
            fetchAndAdd(
              `/api/recipient-groups?type=inflyttning&datum=${inflyttningDatum}`,
              "inflyttning"
            )
          }
        >
          Lägg till
        </Button>

        <TextField
          size="small"
          type="date"
          label="Utflyttning"
          value={utflyttningDatum}
          onChange={(e) => setUtflyttningDatum(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 170 }}
        />
        <Button
          size="small"
          variant="outlined"
          disabled={!utflyttningDatum || !!loading}
          startIcon={loading === "utflyttning" ? <CircularProgress size={12} color="inherit" /> : null}
          onClick={() =>
            fetchAndAdd(
              `/api/recipient-groups?type=utflyttning&datum=${utflyttningDatum}`,
              "utflyttning"
            )
          }
        >
          Lägg till
        </Button>
      </Box>

      {lastResult && (
        <Alert
          severity={lastResult.added > 0 ? "success" : "info"}
          sx={{ py: 0 }}
          onClose={() => setLastResult(null)}
        >
          {lastResult.added > 0
            ? `${lastResult.added} mottagare tillagda`
            : "Inga (nya) mottagare hittades"}
        </Alert>
      )}
    </Box>
  );
}
