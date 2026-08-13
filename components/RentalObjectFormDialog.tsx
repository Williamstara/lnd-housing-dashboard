"use client";

import { useState, useTransition } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { RentalObject, RentalObjectInput } from "@/lib/rentalobjects";

// ─── helpers ─────────────────────────────────────────────────────────────────

function n(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return isNaN(v) ? null : v;
}

function renovPct(renov: string): number {
  if (renov === "2") return 0.02;
  if (renov === "3") return 0.04;
  if (renov === "4") return 0.08;
  return 0;
}

function calcRabatt(malbild: string, renov: string): string {
  const m = n(malbild);
  if (m == null || renov === "") return "";
  return String(Math.round(m * renovPct(renov)));
}

function calcIndividuell(malbild: string, rabatt: string, red: string): string {
  const m = n(malbild);
  if (m == null) return "";
  return String(Math.round(m - Math.abs(n(rabatt) ?? 0) - Math.abs(n(red) ?? 0)));
}

// ─── types ───────────────────────────────────────────────────────────────────

type Form = {
  fastighet: string;
  lagenhetsnummer: string;
  typ: string;
  area: string;
  areaInkKorr: string;
  malbildshyra: string;
  renoveringsbehov: string;
  hyresrabatt: string;
  hyresred: string;
  individuellArshyra: string;
};

function toForm(obj: RentalObject | null): Form {
  if (!obj) {
    return {
      fastighet: "",
      lagenhetsnummer: "",
      typ: "",
      area: "",
      areaInkKorr: "",
      malbildshyra: "",
      renoveringsbehov: "",
      hyresrabatt: "",
      hyresred: "",
      individuellArshyra: "",
    };
  }
  return {
    fastighet: obj.fastighet,
    lagenhetsnummer: obj.lagenhetsnummer,
    typ: obj.typ ?? "",
    area: obj.area != null ? String(obj.area) : "",
    areaInkKorr: obj.areaInkKorr != null ? String(obj.areaInkKorr) : "",
    malbildshyra: obj.malbildshyra != null ? String(obj.malbildshyra) : "",
    renoveringsbehov: obj.renoveringsbehov != null ? String(obj.renoveringsbehov) : "",
    hyresrabatt: obj.hyresrabatt != null ? String(obj.hyresrabatt) : "",
    hyresred: obj.hyresred != null ? String(obj.hyresred) : "",
    individuellArshyra: obj.individuellArshyra != null ? String(obj.individuellArshyra) : "",
  };
}

function toInput(form: Form): RentalObjectInput {
  const individuell = n(form.individuellArshyra);
  return {
    fastighet: form.fastighet.trim(),
    lagenhetsnummer: form.lagenhetsnummer.trim(),
    typ: form.typ.trim(),
    area: n(form.area),
    areaInkKorr: n(form.areaInkKorr),
    malbildshyra: n(form.malbildshyra),
    renoveringsbehov: n(form.renoveringsbehov),
    hyresrabatt: n(form.hyresrabatt),
    hyresred: n(form.hyresred),
    individuellArshyra: individuell,
    manadshyra: individuell != null ? Math.round(individuell / 12) : null,
    planritning: null,
  };
}

// ─── component ───────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  object: RentalObject | null;
  fastigheter: string[];
  customFieldDefs?: Array<{ key: string; label: string }>;
  // Same convention as ApartmentFormDialog.tsx — fields hidden from a
  // nation's list view are hidden here too (docs/SAAS-READINESS-ROADMAP.md
  // Tier 4.1). lagenhetsnummer stays always-shown regardless (required to
  // create a meaningful record at all).
  visibleKeys?: Set<string>;
  // docs/SAAS-READINESS-ROADMAP.md Tier 6.1 — defaults to "kr" (LND's
  // existing hardcoded suffix) when not passed.
  currency?: string;
  locale?: string;
  onClose: () => void;
  onSubmit: (input: RentalObjectInput) => Promise<void>;
};

export default function RentalObjectFormDialog({
  open,
  object,
  fastigheter,
  customFieldDefs = [],
  visibleKeys,
  currency = "kr",
  locale = "sv-SE",
  onClose,
  onSubmit,
}: Props) {
  const shows = (key: string) => !visibleKeys || visibleKeys.has(key);
  const [form, setForm] = useState<Form>(() => toForm(object));
  const [customValues, setCustomValues] = useState<Record<string, string>>(
    () => object?.custom ?? {}
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set(field: keyof Form, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };

      // When renoveringsbehov changes, recalculate hyresrabatt
      if (field === "renoveringsbehov" || (field === "malbildshyra" && prev.renoveringsbehov !== "")) {
        next.hyresrabatt = calcRabatt(
          field === "malbildshyra" ? value : next.malbildshyra,
          field === "renoveringsbehov" ? value : next.renoveringsbehov
        );
      }

      // When anything affecting individuell changes, recalculate it
      if (["malbildshyra", "hyresrabatt", "hyresred", "renoveringsbehov"].includes(field)) {
        next.individuellArshyra = calcIndividuell(
          next.malbildshyra,
          next.hyresrabatt,
          next.hyresred
        );
      }

      return next;
    });
  }

  const manadshyra = n(form.individuellArshyra);
  const manadshyraDisplay =
    manadshyra != null
      ? new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
          Math.round(manadshyra / 12)
        )
      : "—";

  function handleSubmit() {
    if (!form.fastighet || !form.lagenhetsnummer.trim()) {
      setError("Fastighet och lägenhetsnummer krävs.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit({ ...toInput(form), custom: customValues });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{object ? "Redigera objekt" : "Lägg till objekt"}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          {shows("fastighet") && (
            <TextField
              select
              label="Fastighet"
              value={form.fastighet}
              onChange={(e) => set("fastighet", e.target.value)}
              disabled={isPending}
              fullWidth
            >
              {fastigheter.map((f) => (
                <MenuItem key={f} value={f}>{f}</MenuItem>
              ))}
            </TextField>
          )}

          <TextField
            label="Lägenhetsnummer"
            value={form.lagenhetsnummer}
            onChange={(e) => set("lagenhetsnummer", e.target.value)}
            disabled={isPending}
            fullWidth
          />

          {shows("typ") && (
            <TextField
              label="Typ"
              value={form.typ}
              onChange={(e) => set("typ", e.target.value)}
              disabled={isPending}
              fullWidth
            />
          )}

          {(shows("area") || shows("areaInkKorr")) && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {shows("area") && (
                <TextField
                  label="Area (m²)"
                  value={form.area}
                  onChange={(e) => set("area", e.target.value)}
                  disabled={isPending}
                  slotProps={{ input: { inputMode: "decimal" } }}
                />
              )}
              {shows("areaInkKorr") && (
                <TextField
                  label="Area ink korr"
                  value={form.areaInkKorr}
                  onChange={(e) => set("areaInkKorr", e.target.value)}
                  disabled={isPending}
                  slotProps={{ input: { inputMode: "decimal" } }}
                />
              )}
            </Box>
          )}

          {shows("malbildshyra") && (
            <TextField
              label={`Målbildshyra (${currency}/år)`}
              value={form.malbildshyra}
              onChange={(e) => set("malbildshyra", e.target.value)}
              disabled={isPending}
              slotProps={{ input: { inputMode: "decimal" } }}
              fullWidth
            />
          )}

          {(shows("renoveringsbehov") || shows("hyresrabatt")) && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {shows("renoveringsbehov") && (
                <TextField
                  select
                  label="Renoveringsbehov"
                  value={form.renoveringsbehov}
                  onChange={(e) => set("renoveringsbehov", e.target.value)}
                  disabled={isPending}
                >
                  <MenuItem value="">—</MenuItem>
                  <MenuItem value="1">1 — OK (0 %)</MenuItem>
                  <MenuItem value="2">2 — Litet (−2 %)</MenuItem>
                  <MenuItem value="3">3 — Medel (−4 %)</MenuItem>
                  <MenuItem value="4">4 — Stort (−8 %)</MenuItem>
                </TextField>
              )}

              {shows("hyresrabatt") && (
                <TextField
                  label={`Hyresrabatt (${currency}/år)`}
                  value={form.hyresrabatt}
                  onChange={(e) => set("hyresrabatt", e.target.value)}
                  disabled={isPending}
                  slotProps={{ input: { inputMode: "decimal" } }}
                  helperText="Auto från renov."
                />
              )}
            </Box>
          )}

          {shows("hyresred") && (
            <TextField
              label={`Hyresreduktion (${currency}/år)`}
              value={form.hyresred}
              onChange={(e) => set("hyresred", e.target.value)}
              disabled={isPending}
              slotProps={{ input: { inputMode: "decimal" } }}
              fullWidth
            />
          )}

          {shows("individuellArshyra") && (
            <TextField
              label={`Individuell årshyra (${currency}/år)`}
              value={form.individuellArshyra}
              onChange={(e) => set("individuellArshyra", e.target.value)}
              disabled={isPending}
              slotProps={{ input: { inputMode: "decimal" } }}
              fullWidth
              helperText="Auto från målbild − rabatt − red."
            />
          )}

          {shows("manadshyra") && (
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderRadius: 1,
                bgcolor: "action.hover",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Månadshyra (beräknad)
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {manadshyraDisplay} {currency}
              </Typography>
            </Box>
          )}

          {customFieldDefs.map(({ key, label }) => (
            <TextField
              key={key}
              label={label}
              value={customValues[key] ?? ""}
              onChange={(e) => setCustomValues((prev) => ({ ...prev, [key]: e.target.value }))}
              disabled={isPending}
              fullWidth
            />
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isPending}>Avbryt</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isPending}>
          {object ? "Spara" : "Lägg till"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
