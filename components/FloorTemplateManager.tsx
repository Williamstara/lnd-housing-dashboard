"use client";

import { useState, useTransition } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { deleteFloorTemplateAction, saveFloorTemplateAction } from "@/app/fastigheter/actions";
import FloorBlockGridEditor from "@/components/FloorBlockGridEditor";
import type { FloorLayoutBlock } from "@/lib/building-floor-logic";
import type { BuildingFloorTemplate } from "@/lib/building-floor-templates";

export default function FloorTemplateManager({ templates, canManage }: { templates: BuildingFloorTemplate[]; canManage: boolean }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = templates.find((template) => template.id === selectedId);
  const [name, setName] = useState("");
  const [blocks, setBlocks] = useState<FloorLayoutBlock[]>([]);
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function open(template?: BuildingFloorTemplate) {
    setSelectedId(template?.id ?? "new");
    setName(template?.name ?? "");
    setBlocks(template?.blocks.map((block) => ({ ...block })) ?? []);
    setMessage(null);
  }

  function save() {
    setMessage(null);
    startTransition(async () => {
      try {
        await saveFloorTemplateAction(name, blocks);
        setMessage({ severity: "success", text: "Planmallen har sparats." });
      } catch (error) {
        setMessage({ severity: "error", text: error instanceof Error ? error.message : "Planmallen kunde inte sparas." });
      }
    });
  }

  function remove(template: BuildingFloorTemplate) {
    if (!window.confirm(`Ta bort planmallen ${template.name}?`)) return;
    setMessage(null);
    startTransition(async () => {
      try {
        await deleteFloorTemplateAction(template.id);
        if (selectedId === template.id) setSelectedId(null);
        setMessage({ severity: "success", text: "Planmallen har tagits bort." });
      } catch (error) {
        setMessage({ severity: "error", text: error instanceof Error ? error.message : "Planmallen kunde inte tas bort." });
      }
    });
  }

  return <Stack spacing={2}>
    <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 1 }}>
      <div><Typography variant="h6">Planmallar</Typography><Typography variant="body2" color="text.secondary">Rita en generell våningsplan och applicera den sedan på en våning i Bostadskartan. Lägenhetsplatser får sina nummer först när mallen används.</Typography></div>
      {canManage ? <Button variant="contained" startIcon={<AddIcon />} onClick={() => open()}>Ny planmall</Button> : null}
    </Stack>
    {message ? <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert> : null}
    {!templates.length && selectedId === null ? <Alert severity="info">Det finns inga planmallar ännu.</Alert> : <Paper variant="outlined"><List disablePadding>{templates.map((template) => <ListItem key={template.id} disablePadding={canManage} divider secondaryAction={canManage ? <IconButton aria-label={`Ta bort ${template.name}`} color="error" onClick={() => remove(template)} disabled={isPending}><DeleteIcon /></IconButton> : undefined}>{canManage ? <ListItemButton onClick={() => open(template)} selected={selectedId === template.id}><ListItemText primary={template.name} secondary={`${template.blocks.length} block`} /></ListItemButton> : <ListItemText primary={template.name} secondary={`${template.blocks.length} block`} />}</ListItem>)}</List></Paper>}
    {canManage && selectedId !== null ? <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}><Stack spacing={2}>
      <TextField required name="template-name" autoComplete="off" label="Mallnamn" value={name} onChange={(event) => setName(event.target.value)} disabled={isPending || !!selected} helperText={selected ? "Skapa en ny mall för att använda ett annat namn." : undefined} sx={{ maxWidth: 420 }} />
      <FloorBlockGridEditor blocks={blocks} onChange={setBlocks} />
      <Stack direction="row" sx={{ justifyContent: "flex-end", gap: 1 }}><Button onClick={() => setSelectedId(null)} disabled={isPending}>Stäng</Button><Button variant="contained" onClick={save} disabled={isPending || !name.trim() || blocks.length === 0}>{isPending ? "Sparar…" : "Spara planmall"}</Button></Stack>
    </Stack></Paper> : null}
  </Stack>;
}
