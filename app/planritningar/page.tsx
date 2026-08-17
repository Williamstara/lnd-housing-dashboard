"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SearchIcon from "@mui/icons-material/Search";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import FloorPlanCard from "@/components/email/FloorPlanCard";
import RenamePlanDialog from "@/components/email/RenamePlanDialog";
import UploadConfirmDialog from "@/components/email/UploadConfirmDialog";
import RequireSignedIn from "@/components/RequireSignedIn";

interface FloorPlan { id: string; aptName: string }

export default function PlanritningarPage() {
  const [plans, setPlans] = useState<FloorPlan[]>([]);
  const [search, setSearch] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [renamePlan, setRenamePlan] = useState<FloorPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<FloorPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPlans() {
    try {
      setError(null);
      const res = await fetch("/api/floor-plans");
      setPlans((await res.json()) as FloorPlan[]);
    } catch {
      setError("Kunde inte ladda planritningar.");
    }
  }

  useEffect(() => { loadPlans(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? plans.filter((p) => p.aptName.toLowerCase().includes(q)) : plans;
  }, [plans, search]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) setPendingFiles(files);
    e.target.value = "";
  }

  async function handleUpload() {
    setLoading(true);
    try {
      await Promise.all(
        pendingFiles.map((f) => {
          const form = new FormData();
          form.append("file", f);
          return fetch("/api/floor-plans", { method: "POST", body: form });
        })
      );
      setPendingFiles([]);
      await loadPlans();
    } catch {
      setError("En eller flera uppladdningar misslyckades.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(id: string, aptName: string) {
    setLoading(true);
    try {
      await fetch(`/api/floor-plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aptName }),
      });
      setRenamePlan(null);
      await loadPlans();
    } catch {
      setError("Kunde inte byta namn.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deletingPlan) return;
    try {
      await fetch(`/api/floor-plans/${deletingPlan.id}`, { method: "DELETE" });
      setDeletingPlan(null);
      await loadPlans();
    } catch {
      setError("Kunde inte ta bort planritningen.");
    }
  }

  return (
    <RequireSignedIn>
    <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>Planritningar</Typography>
        <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
          Ladda upp planritningar
          <input type="file" hidden accept="application/pdf" multiple onChange={handleFileChange} />
        </Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        label="Sök"
        placeholder="Sök lägenhet…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        sx={{ mb: 3, width: 280 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />

      {filtered.length === 0 ? (
        <Typography color="text.secondary">
          {plans.length === 0 ? "Inga planritningar ännu" : "Inga träffar"}
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((plan) => (
            <Grid key={plan.id} size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }}>
              <FloorPlanCard plan={plan} onEdit={setRenamePlan} onDelete={() => setDeletingPlan(plan)} />
            </Grid>
          ))}
        </Grid>
      )}

      <UploadConfirmDialog
        files={pendingFiles}
        loading={loading}
        onConfirm={handleUpload}
        onCancel={() => setPendingFiles([])}
      />
      <RenamePlanDialog
        plan={renamePlan}
        loading={loading}
        onClose={() => setRenamePlan(null)}
        onSave={handleRename}
      />
      <Dialog open={!!deletingPlan} onClose={() => setDeletingPlan(null)} fullWidth maxWidth="xs">
        <DialogTitle>Ta bort planritning</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Ta bort planritningen för “{deletingPlan?.aptName}”? Åtgärden går inte att ångra.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingPlan(null)}>Avbryt</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Ta bort planritning
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </RequireSignedIn>
  );
}
