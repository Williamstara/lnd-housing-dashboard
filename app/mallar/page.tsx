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
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import TemplateEditorDialog from "@/components/email/TemplateEditorDialog";

interface MailTemplate {
  id: string;
  name: string;
  message: string;
  starred: boolean;
  attachmentName: string | null;
}

export default function MallarPage() {
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MailTemplate | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<MailTemplate | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  async function load() {
    try {
      setError(null);
      const response = await fetch("/api/mail-templates");
      setTemplates((await response.json()) as MailTemplate[]);
    } catch {
      setError("Kunde inte ladda mallar.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleStar(id: string) {
    try {
      await fetch(`/api/mail-templates/${id}`, { method: "PATCH" });
      await load();
    } catch {
      setError("Kunde inte markera mall.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/mail-templates/${id}`, { method: "DELETE" });
      setDeletingTemplate(null);
      await load();
    } catch {
      setError("Kunde inte ta bort mallen.");
    }
  }

  const pageTemplates = templates.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function openEditor(template: MailTemplate | null) {
    setEditingTemplate(template);
    setDialogOpen(true);
  }

  return (
    <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}>
        <Typography variant="h4" component="h1">E-postmallar</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => openEditor(null)}>
          Ny mall
        </Button>
      </Stack>

      {error ? <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert> : null}

      <Box sx={{ display: { xs: "none", sm: "block" } }}>
        <TableContainer component={Paper}>
          <Table size="small" aria-label="E-postmallar">
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
                <TableRow><TableCell colSpan={5} align="center">Inga mallar ännu.</TableCell></TableRow>
              ) : pageTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell sx={{ pr: 0 }}>
                    <IconButton
                      aria-label={template.starred ? "Avmarkera som standardmall" : "Markera som standardmall"}
                      size="small"
                      onClick={() => handleStar(template.id)}
                    >
                      {template.starred ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{template.name}</TableCell>
                  <TableCell sx={{ maxWidth: 480, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {template.message}
                  </TableCell>
                  <TableCell>
                    {template.attachmentName ? <AttachFileIcon fontSize="small" color="action" titleAccess={template.attachmentName} /> : null}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton aria-label="Redigera mall" size="small" onClick={() => openEditor(template)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label="Ta bort mall" size="small" color="error" onClick={() => setDeletingTemplate(template)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        {templates.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>Inga mallar ännu.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {pageTemplates.map((template) => (
              <Card key={template.id} variant="outlined">
                <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, mb: 1 }}>
                    <IconButton
                      aria-label={template.starred ? "Avmarkera som standardmall" : "Markera som standardmall"}
                      size="small"
                      onClick={() => handleStar(template.id)}
                    >
                      {template.starred ? <StarIcon fontSize="small" color="warning" /> : <StarBorderIcon fontSize="small" />}
                    </IconButton>
                    <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }}>{template.name}</Typography>
                    <IconButton aria-label="Redigera mall" size="small" onClick={() => openEditor(template)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton aria-label="Ta bort mall" size="small" color="error" onClick={() => setDeletingTemplate(template)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                    {template.message}
                  </Typography>
                  {template.attachmentName ? (
                    <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, mt: 1.5 }}>
                      <AttachFileIcon fontSize="small" color="action" />
                      <Typography variant="caption" color="text.secondary">{template.attachmentName}</Typography>
                    </Stack>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      <TablePagination
        component="div"
        count={templates.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50]}
        labelRowsPerPage="Rader per sida:"
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} av ${count}`}
      />

      <Dialog open={!!deletingTemplate} onClose={() => setDeletingTemplate(null)} fullWidth maxWidth="xs">
        <DialogTitle>Ta bort e-postmall</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Ta bort mallen “{deletingTemplate?.name}”? Åtgärden går inte att ångra.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeletingTemplate(null)}>Avbryt</Button>
          <Button color="error" variant="contained" onClick={() => deletingTemplate && handleDelete(deletingTemplate.id)}>
            Ta bort mall
          </Button>
        </DialogActions>
      </Dialog>

      <TemplateEditorDialog
        open={dialogOpen}
        editingTemplate={editingTemplate}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
      />
    </Container>
  );
}
