"use client";

import { useState, useTransition } from "react";
import { useUser } from "@auth0/nextjs-auth0";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  createFastighetAction,
  deleteFastighetAction,
  updateFastighetAction,
} from "@/app/fastigheter/actions";
import type { Fastighet } from "@/lib/fastigheter";
import { ROLES, hasRole } from "@/lib/roles";

type Props = { fastigheter: Fastighet[] };

export default function FastigheterTable({ fastigheter }: Props) {
  const { user } = useUser();
  const isHusforman = hasRole(user, ROLES.HUSFORMAN);

  const [newNamn, setNewNamn] = useState("");
  const [editing, setEditing] = useState<Fastighet | null>(null);
  const [editNamn, setEditNamn] = useState("");
  const [deleting, setDeleting] = useState<Fastighet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!newNamn.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createFastighetAction(newNamn);
        setNewNamn("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  function openEdit(f: Fastighet) {
    setEditing(f);
    setEditNamn(f.namn);
  }

  function handleEditSave() {
    if (!editing || !editNamn.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateFastighetAction(editing.id, editNamn);
        setEditing(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  function confirmDelete() {
    if (!deleting) return;
    const id = deleting.id;
    startTransition(async () => {
      try {
        await deleteFastighetAction(id);
        setDeleting(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  return (
    <>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
        Fastigheter
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Byggnader som används i dropdown-listor och validering för lediga
        lägenheter, hyresgäster och databasen.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        <List disablePadding>
          {fastigheter.length === 0 ? (
            <ListItem>
              <ListItemText primary="Inga fastigheter ännu." />
            </ListItem>
          ) : (
            fastigheter.map((f) => (
              <ListItem
                key={f.id}
                divider
                secondaryAction={
                  isHusforman ? (
                    <Stack direction="row">
                      <IconButton
                        aria-label="Byt namn"
                        size="small"
                        onClick={() => openEdit(f)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="Ta bort"
                        size="small"
                        onClick={() => setDeleting(f)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ) : undefined
                }
              >
                <ListItemText primary={f.namn} />
              </ListItem>
            ))
          )}
        </List>
      </Paper>

      {isHusforman && (
        <Stack direction="row" sx={{ gap: 1, mt: 2 }}>
          <TextField
            placeholder="Namn på ny fastighet"
            size="small"
            value={newNamn}
            onChange={(e) => setNewNamn(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={isPending || !newNamn.trim()}
            onClick={handleAdd}
          >
            Lägg till
          </Button>
        </Stack>
      )}

      <Dialog open={!!editing} onClose={() => setEditing(null)} fullWidth maxWidth="xs">
        <DialogTitle>Byt namn</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            sx={{ mt: 1 }}
            value={editNamn}
            onChange={(e) => setEditNamn(e.target.value)}
            disabled={isPending}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)} disabled={isPending}>
            Avbryt
          </Button>
          <Button variant="contained" onClick={handleEditSave} disabled={isPending}>
            Spara
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
        <DialogTitle>Ta bort fastighet</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Är du säker på att du vill ta bort {deleting?.namn}? Befintliga
            lägenheter/hyresgäster påverkas inte, men fastigheten försvinner
            från listorna.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} disabled={isPending}>
            Avbryt
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={isPending}
          >
            Ta bort
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
