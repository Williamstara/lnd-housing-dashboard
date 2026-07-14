"use client";

import { useEffect, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import TemplateEditorDialog from "@/components/email/TemplateEditorDialog";

interface MailTemplate { id: string; name: string; message: string; starred: boolean; attachmentName: string | null }

export default function MallarPage() {
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MailTemplate | null>(null);

  async function load() {
    try {
      setError(null);
      const res = await fetch("/api/mail-templates");
      const data = (await res.json()) as MailTemplate[];
      setTemplates(data);
    } catch {
      setError("Kunde inte ladda mallar.");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleStar(id: string) {
    try {
      await fetch(`/api/mail-templates/${id}`, { method: "PATCH" });
      await load();
    } catch {
      setError("Kunde inte markera mall.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Ta bort denna mall?")) return;
    try {
      await fetch(`/api/mail-templates/${id}`, { method: "DELETE" });
      await load();
    } catch {
      setError("Kunde inte ta bort mallen.");
    }
  }

  return (
    <Container maxWidth={false} sx={{ py: 6, width: "80%", mx: "auto" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>E-postmallar</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditingTemplate(null); setDialogOpen(true); }}>
          Ny mall
        </Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40 }} />
              <TableCell>Namn</TableCell>
              <TableCell>Meddelande</TableCell>
              <TableCell sx={{ width: 40 }} title="Fast bilaga" />
              <TableCell align="right">Åtgärder</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">Inga mallar ännu</TableCell>
              </TableRow>
            ) : templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell sx={{ pr: 0 }}>
                  <IconButton size="small" onClick={() => handleStar(t.id)} title={t.starred ? "Standardmall (klicka för att avmarkera)" : "Markera som standardmall"}>
                    {t.starred ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
                  </IconButton>
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{t.name}</TableCell>
                <TableCell sx={{ maxWidth: 480, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.message}
                </TableCell>
                <TableCell>
                  {t.attachmentName && (
                    <AttachFileIcon fontSize="small" color="action" titleAccess={t.attachmentName} />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => { setEditingTemplate(t); setDialogOpen(true); }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TemplateEditorDialog
        open={dialogOpen}
        editingTemplate={editingTemplate}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />
    </Container>
  );
}
