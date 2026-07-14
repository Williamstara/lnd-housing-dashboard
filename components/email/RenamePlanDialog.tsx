"use client";

import { useEffect, useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";

interface FloorPlan { id: string; aptName: string }

interface Props {
  plan: FloorPlan | null;
  loading: boolean;
  onClose: () => void;
  onSave: (id: string, aptName: string) => void;
}

export default function RenamePlanDialog({ plan, loading, onClose, onSave }: Props) {
  const [aptName, setAptName] = useState("");

  useEffect(() => {
    if (plan) setAptName(plan.aptName);
  }, [plan]);

  return (
    <Dialog open={!!plan} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Byt namn på planritning</DialogTitle>
      <DialogContent sx={{ pt: "16px !important" }}>
        <TextField
          label="Lägenhetsnummer"
          fullWidth
          value={aptName}
          onChange={(e) => setAptName(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Avbryt</Button>
        <Button
          variant="contained"
          onClick={() => plan && onSave(plan.id, aptName)}
          disabled={loading || !aptName.trim()}
        >
          Spara
        </Button>
      </DialogActions>
    </Dialog>
  );
}
