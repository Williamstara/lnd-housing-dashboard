"use client";

import { useRef, useState, type PointerEvent } from "react";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { clampBlockPosition, findFreeBlockPosition, hasBlockCollision, type FloorLayoutBlock } from "@/lib/building-floor-logic";

export const blockLabels = { apartment: "Lägenhet", common: "Gemensamt utrymme", corridor: "Korridor", blocked: "Blockerad yta", empty: "Tomt rum" } as const;
export const blockColors = { apartment: "primary.light", common: "success.light", corridor: "warning.light", blocked: "action.disabledBackground", empty: "background.paper" } as const;

type Props = {
  blocks: FloorLayoutBlock[];
  apartmentNumbers?: string[];
  onChange: (blocks: FloorLayoutBlock[]) => void;
};

export default function FloorBlockGridEditor({ blocks, apartmentNumbers, onChange }: Props) {
  const [type, setType] = useState<FloorLayoutBlock["type"]>("apartment");
  const [roomNumber, setRoomNumber] = useState("");
  const [label, setLabel] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collisionMessage, setCollisionMessage] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number; grid: DOMRect } | null>(null);
  const rows = Math.max(16, ...blocks.map((block) => block.y + block.height + 2));
  const unusedRooms = apartmentNumbers?.filter((number) => !blocks.some((block) => block.lagenhetsnummer === number)) ?? [];
  const selected = blocks.find((block) => block.id === selectedId) ?? null;

  function update(id: string, values: Partial<FloorLayoutBlock>, reportCollision = true) {
    const current = blocks.find((block) => block.id === id);
    if (!current) return;
    const candidate = { ...current, ...values };
    const geometryChanged = values.x !== undefined || values.y !== undefined || values.width !== undefined || values.height !== undefined;
    if (geometryChanged && hasBlockCollision(candidate, blocks)) {
      if (reportCollision) setCollisionMessage("Block får inte överlappa varandra. Flytta blocket eller minska ett av dem först.");
      return;
    }
    setCollisionMessage(null);
    onChange(blocks.map((block) => block.id === id ? candidate : block));
  }

  function move(id: string, dx: number, dy: number) {
    const block = blocks.find((item) => item.id === id);
    if (block) update(id, clampBlockPosition(block.x + dx, block.y + dy, block.width, block.height));
  }

  function startDragging(event: PointerEvent<HTMLDivElement>, block: FloorLayoutBlock) {
    if ((event.target as HTMLElement).closest("button") || !gridRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      id: block.id,
      offsetX: Math.floor((event.clientX - rect.left) / (rect.width / block.width)),
      offsetY: Math.floor((event.clientY - rect.top) / (rect.height / block.height)),
      grid: gridRef.current.getBoundingClientRect(),
    };
    setSelectedId(block.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function drag(event: PointerEvent<HTMLDivElement>, block: FloorLayoutBlock) {
    const active = dragRef.current;
    if (!active || active.id !== block.id) return;
    const x = Math.floor((event.clientX - active.grid.left - 8) / ((active.grid.width - 16) / 12)) - active.offsetX;
    const y = Math.floor((event.clientY - active.grid.top - 8) / 34) - active.offsetY;
    update(block.id, clampBlockPosition(x, y, block.width, block.height), false);
  }

  function addBlock() {
    const templateApartment = type === "apartment" && !apartmentNumbers;
    if (type === "apartment" && apartmentNumbers && !roomNumber) return;
    const blockLabel = templateApartment ? "Lägenhet" : type === "apartment" ? roomNumber : label.trim() || blockLabels[type];
    const next: FloorLayoutBlock = {
      id: crypto.randomUUID(), type, x: 0, y: rows - 2,
      width: type === "corridor" ? 6 : 3, height: 2, label: blockLabel,
      ...(type === "apartment" && roomNumber ? { lagenhetsnummer: roomNumber } : {}),
    };
    onChange([...blocks, next]);
    setSelectedId(next.id);
    setLabel("");
    setRoomNumber("");
  }

  function duplicateSelected() {
    if (!selected || (selected.type === "apartment" && apartmentNumbers)) return;
    const position = findFreeBlockPosition(selected, blocks);
    if (!position) {
      setCollisionMessage("Det finns ingen ledig yta som rymmer en kopia av blocket.");
      return;
    }
    const copy = { ...selected, ...position, id: crypto.randomUUID() };
    onChange([...blocks, copy]);
    setSelectedId(copy.id);
  }

  return <Stack spacing={2}>
    <Stack direction={{ xs: "column", md: "row" }} sx={{ gap: 1 }}>
      <FormControl size="small" sx={{ minWidth: 190 }}>
        <InputLabel id="block-type-label">Blocktyp</InputLabel>
        <Select labelId="block-type-label" label="Blocktyp" value={type} onChange={(event) => setType(event.target.value as FloorLayoutBlock["type"])}>
          {Object.entries(blockLabels).map(([value, text]) => <MenuItem key={value} value={value}>{text}</MenuItem>)}
        </Select>
      </FormControl>
      {type === "apartment" && apartmentNumbers ? <FormControl size="small" sx={{ minWidth: 170 }}>
        <InputLabel id="room-label">Lägenhet</InputLabel>
        <Select labelId="room-label" label="Lägenhet" value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)}>
          {unusedRooms.map((number) => <MenuItem key={number} value={number}>{number}</MenuItem>)}
        </Select>
      </FormControl> : type !== "apartment" ? <TextField size="small" label="Etikett" placeholder={blockLabels[type]} value={label} onChange={(event) => setLabel(event.target.value)} /> : null}
      <Button variant="contained" startIcon={<AddIcon />} onClick={addBlock} disabled={type === "apartment" && !!apartmentNumbers && !roomNumber}>Lägg till block</Button>
    </Stack>
    <Box sx={{ overflowX: "auto" }}>
      <Box ref={gridRef} aria-label="Ritningsyta" sx={{ minWidth: 680, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: `repeat(${rows}, 34px)`, gap: "2px", p: 1, bgcolor: "action.hover", backgroundImage: "linear-gradient(to right, rgba(0,0,0,.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.08) 1px, transparent 1px)", backgroundSize: "calc(100% / 12) 34px" }}>
        {blocks.map((block) => <Paper key={block.id} onPointerDown={(event) => startDragging(event, block)} onPointerMove={(event) => drag(event, block)} onPointerUp={(event) => { dragRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { dragRef.current = null; }} tabIndex={0} onFocus={() => setSelectedId(block.id)} onKeyDown={(event) => { if (event.key === "ArrowLeft") move(block.id, -1, 0); if (event.key === "ArrowRight") move(block.id, 1, 0); if (event.key === "ArrowUp") move(block.id, 0, -1); if (event.key === "ArrowDown") move(block.id, 0, 1); }} sx={{ gridColumn: `${block.x + 1} / span ${block.width}`, gridRow: `${block.y + 1} / span ${block.height}`, bgcolor: blockColors[block.type], p: .75, overflow: "hidden", cursor: "grab", userSelect: "none", touchAction: "none", border: selectedId === block.id ? 2 : 1, borderColor: selectedId === block.id ? "primary.main" : "divider", "&:active": { cursor: "grabbing" }, "&:focus-visible": { outline: "3px solid", outlineColor: "primary.main" } }}>
          <Typography variant="caption" noWrap sx={{ display: "block", fontWeight: 700 }}>{block.label || blockLabels[block.type]}</Typography>
        </Paper>)}
      </Box>
    </Box>
    {collisionMessage ? <Alert severity="warning" onClose={() => setCollisionMessage(null)}>{collisionMessage}</Alert> : null}
    {selected ? <Paper variant="outlined" sx={{ p: 1.5 }}><Stack spacing={1.5}><Typography sx={{ fontWeight: 600 }}>Markerat block</Typography><TextField size="small" name="block-label" autoComplete="off" label="Etikett" value={selected.label} onChange={(event) => update(selected.id, { label: event.target.value })} slotProps={{ htmlInput: { maxLength: 80 } }} sx={{ maxWidth: 420 }} /><Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 1, flexWrap: "wrap" }}><Button size="small" onClick={() => update(selected.id, { width: Math.min(12 - selected.x, selected.width + 1) })}>Bredare</Button><Button size="small" onClick={() => update(selected.id, { width: Math.max(1, selected.width - 1) })}>Smalare</Button><Button size="small" onClick={() => update(selected.id, { height: Math.min(100 - selected.y, selected.height + 1) })}>Högre</Button><Button size="small" onClick={() => update(selected.id, { height: Math.max(1, selected.height - 1) })}>Lägre</Button><Button size="small" startIcon={<ContentCopyIcon />} onClick={duplicateSelected} disabled={selected.type === "apartment" && !!apartmentNumbers}>Duplicera block</Button><Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => { onChange(blocks.filter((item) => item.id !== selected.id)); setSelectedId(null); }}>Ta bort block</Button></Stack>{selected.type === "apartment" && apartmentNumbers ? <Typography variant="caption" color="text.secondary">Ett lägenhetsblock kan inte dupliceras på en våning eftersom varje lägenhetsnummer är unikt.</Typography> : null}</Stack></Paper> : <Typography variant="body2" color="text.secondary">Markera ett block för att ändra etikett, storlek eller duplicera det.</Typography>}
  </Stack>;
}
