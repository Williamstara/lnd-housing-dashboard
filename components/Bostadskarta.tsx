"use client";

import { useMemo, useState, useTransition } from "react";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { createFloorAction, deleteFloorAction, reorderFloorsAction, saveFloorBlocksAction, updateFloorAction } from "@/app/bostadskarta/actions";
import FloorBlockGridEditor, { blockColors, blockLabels } from "@/components/FloorBlockGridEditor";
import { generateRoomNumbers, placeRooms, roomsToBlocks, type FloorLayoutBlock, type FloorSeries, type PlacementMode, type ResidentMatch, type RoomPlacement } from "@/lib/building-floor-logic";
import type { BuildingFloor } from "@/lib/building-floors";
import type { BuildingFloorTemplate } from "@/lib/building-floor-templates";
import type { Fastighet } from "@/lib/fastigheter";

type RoomView = RoomPlacement & { residents: ResidentMatch; existsInDatabase: boolean };
type FloorView = Omit<BuildingFloor, "rooms"> & { rooms: RoomView[] };
type Props = { fastigheter: Fastighet[]; floors: FloorView[]; templates: BuildingFloorTemplate[]; canManage: boolean };

const modeLabels: Record<PlacementMode, string> = {
  alternating_left: "Växelvis, vänster först", alternating_right: "Växelvis, höger först", left_first: "Vänster sida först", right_first: "Höger sida först",
};
const emptySeries: FloorSeries = { prefix: "", start: 1001, end: 1017, padTo: 0 };

export default function Bostadskarta({ fastigheter, floors, templates, canManage }: Props) {
  const [buildingId, setBuildingId] = useState(fastigheter[0]?.id ?? "");
  const buildingFloors = useMemo(() => floors.filter((floor) => floor.fastighetId === buildingId), [floors, buildingId]);
  const [floorId, setFloorId] = useState("");
  const floor = buildingFloors.find((item) => item.id === floorId) ?? buildingFloors[0];
  const [selectedRoom, setSelectedRoom] = useState<RoomView | null>(null);
  const [editingBlocks, setEditingBlocks] = useState(false);
  const [draftBlocks, setDraftBlocks] = useState<FloorLayoutBlock[]>([]);
  const [formFloor, setFormFloor] = useState<FloorView | "new" | null>(null);
  const [deleteFloor, setDeleteFloor] = useState<FloorView | null>(null);
  const [message, setMessage] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>, success: string, close?: () => void) {
    setMessage(null);
    startTransition(async () => { try { await action(); close?.(); setMessage({ severity: "success", text: success }); } catch (error) { setMessage({ severity: "error", text: error instanceof Error ? error.message : "Något gick fel." }); } });
  }
  function startBlockEditor() { if (!floor) return; setDraftBlocks(floor.layoutBlocks.length ? floor.layoutBlocks : roomsToBlocks(floor.rooms)); setEditingBlocks(true); }
  function moveFloor(direction: -1 | 1) {
    if (!floor) return;
    const index = buildingFloors.findIndex((item) => item.id === floor.id), target = index + direction;
    if (target < 0 || target >= buildingFloors.length) return;
    const ids = buildingFloors.map((item) => item.id); [ids[index], ids[target]] = [ids[target], ids[index]];
    run(() => reorderFloorsAction(buildingId, ids), "Våningsordningen har sparats.");
  }

  if (fastigheter.length === 0) return <Alert severity="info">Det finns inga fastigheter ännu. Skapa en under Fastigheter först.</Alert>;
  return <Stack spacing={3}>
    <Box><Typography component="h1" variant="h4" sx={{ fontWeight: 650 }}>Bostadskarta</Typography><Typography color="text.secondary">Välj fastighet och våning för att se bostäder och registrerade boende.</Typography></Box>
    {message ? <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert> : null}
    <Paper variant="outlined" sx={{ p: 2 }}><Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2, alignItems: { sm: "center" } }}>
      <FormControl size="small" sx={{ minWidth: 260 }}><InputLabel id="building-label">Fastighet</InputLabel><Select labelId="building-label" label="Fastighet" value={buildingId} onChange={(event) => { setBuildingId(event.target.value); setFloorId(""); setEditingBlocks(false); }} disabled={isPending}>{fastigheter.map((item) => <MenuItem key={item.id} value={item.id}>{item.namn}</MenuItem>)}</Select></FormControl>
      <Box sx={{ flex: 1, minWidth: 0 }}>{buildingFloors.length ? <Tabs value={floor?.id ?? false} onChange={(_, value) => { setFloorId(value); setEditingBlocks(false); }} variant="scrollable" scrollButtons="auto" aria-label="Våningar">{buildingFloors.map((item) => <Tab key={item.id} value={item.id} label={item.namn} />)}</Tabs> : <Typography color="text.secondary">Fastigheten har inga våningar ännu.</Typography>}</Box>
      {canManage ? <Button startIcon={<AddIcon />} variant="contained" onClick={() => setFormFloor("new")}>Ny våning</Button> : null}
    </Stack></Paper>

    {floor ? <>
      {canManage ? <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        <Button startIcon={<EditIcon />} onClick={() => setFormFloor(floor)}>Ändra våning</Button>
        <Button onClick={startBlockEditor} disabled={editingBlocks}>Redigera ritning</Button>
        <Button startIcon={<ArrowUpwardIcon />} onClick={() => moveFloor(-1)} disabled={isPending || buildingFloors[0]?.id === floor.id}>Flytta våning upp</Button>
        <Button startIcon={<ArrowDownwardIcon />} onClick={() => moveFloor(1)} disabled={isPending || buildingFloors.at(-1)?.id === floor.id}>Flytta våning ned</Button>
        <Button color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteFloor(floor)}>Ta bort</Button>
      </Stack> : null}
      {editingBlocks ? <BlockEditor blocks={draftBlocks} rooms={floor.rooms} templates={templates} pending={isPending} onChange={setDraftBlocks} onCancel={() => setEditingBlocks(false)} onSave={() => run(() => saveFloorBlocksAction(floor.id, draftBlocks), "Ritningen har sparats.", () => setEditingBlocks(false))} /> : floor.layoutBlocks.length ? <BlockCanvas blocks={floor.layoutBlocks} rooms={floor.rooms} onSelect={setSelectedRoom} /> : <Corridor rooms={floor.rooms} onSelect={setSelectedRoom} />}
    </> : null}

    <RoomDialog room={selectedRoom} onClose={() => setSelectedRoom(null)} />
    <FloorDialog key={formFloor === "new" ? `new-${buildingId}` : formFloor?.id ?? "closed"} openFloor={formFloor} buildingId={buildingId} pending={isPending} onClose={() => setFormFloor(null)} onSave={(name, series, mode) => run(() => formFloor === "new" ? createFloorAction(buildingId, name, series, mode) : updateFloorAction(formFloor!.id, name, series, mode), formFloor === "new" ? "Våningen har skapats." : "Våningen har uppdaterats.", () => setFormFloor(null))} />
    <Dialog open={!!deleteFloor} onClose={() => !isPending && setDeleteFloor(null)}><DialogTitle>Ta bort våning?</DialogTitle><DialogContent><DialogContentText>Våningen och dess manuella placering tas bort. Lägenheter och hyresgäster påverkas inte.</DialogContentText></DialogContent><DialogActions><Button onClick={() => setDeleteFloor(null)} disabled={isPending}>Avbryt</Button><Button color="error" variant="contained" disabled={isPending} onClick={() => deleteFloor && run(() => deleteFloorAction(deleteFloor.id), "Våningen har tagits bort.", () => setDeleteFloor(null))}>Ta bort</Button></DialogActions></Dialog>
  </Stack>;
}

function Corridor({ rooms, onSelect }: { rooms: RoomView[]; onSelect: (room: RoomView) => void }) {
  if (!rooms.length) return <Alert severity="info">Våningen saknar bostäder.</Alert>;
  return <Paper variant="outlined" sx={{ overflow: "hidden", bgcolor: "action.hover", p: { xs: 2, md: 4 } }}>
    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: { xs: 1, md: 5 }, perspective: { md: "900px" }, maxWidth: 1050, mx: "auto", position: "relative", "&::after": { content: '""', display: { xs: "none", md: "block" }, position: "absolute", inset: "0 46%", bgcolor: "background.paper", transform: "rotateX(62deg)", transformOrigin: "bottom", boxShadow: 2 } }}>
      {(["left", "right"] as const).map((side) => <Stack key={side} spacing={1.5} sx={{ zIndex: 1, transform: { md: side === "left" ? "rotateY(8deg)" : "rotateY(-8deg)" }, transformOrigin: side === "left" ? "right" : "left" }}>{rooms.filter((room) => room.side === side).sort((a, b) => a.position - b.position).map((room) => <Button key={room.lagenhetsnummer} onClick={() => onSelect(room)} variant="outlined" color={room.existsInDatabase ? "primary" : "warning"} sx={{ minHeight: 92, bgcolor: "background.paper", display: "block", textAlign: "left", px: 2, transition: "transform 150ms ease", "@media (prefers-reduced-motion: reduce)": { transition: "none" }, "&:hover": { transform: { md: "translateZ(12px)" }, bgcolor: "background.paper" } }}><Stack direction="row" sx={{ justifyContent: "space-between" }}><Typography sx={{ fontWeight: 700 }}>{room.lagenhetsnummer}</Typography>{!room.existsInDatabase ? <WarningAmberIcon fontSize="small" aria-label="Saknas i Databas" /> : null}</Stack><Typography variant="body2" color="text.secondary" noWrap>{room.residents.primary ?? "Ingen registrerad förstahandshyresgäst"}</Typography></Button>)}</Stack>)}
    </Box>
  </Paper>;
}

function BlockCanvas({ blocks, rooms, onSelect }: { blocks: FloorLayoutBlock[]; rooms: RoomView[]; onSelect: (room: RoomView) => void }) {
  const rows = Math.max(12, ...blocks.map((block) => block.y + block.height));
  return <Paper variant="outlined" sx={{ p: { xs: 1, sm: 2 }, overflowX: "auto" }}><Box sx={{ minWidth: 680, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: `repeat(${rows}, 34px)`, gap: "2px", p: 1, bgcolor: "action.hover", backgroundImage: "linear-gradient(to right, rgba(0,0,0,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,.06) 1px, transparent 1px)", backgroundSize: "calc(100% / 12) 34px" }}>{blocks.map((block) => {
    const room = rooms.find((item) => item.lagenhetsnummer === block.lagenhetsnummer);
    return <Button key={block.id} onClick={() => room && onSelect(room)} disabled={block.type === "blocked"} variant="outlined" color={block.type === "apartment" ? "primary" : "inherit"} sx={{ gridColumn: `${block.x + 1} / span ${block.width}`, gridRow: `${block.y + 1} / span ${block.height}`, bgcolor: blockColors[block.type], color: "text.primary", minWidth: 0, p: 1, display: "block", overflow: "hidden", borderStyle: block.type === "empty" ? "dashed" : "solid", "&:hover": { bgcolor: blockColors[block.type] } }}><Typography variant="caption" component="span" sx={{ display: "block", fontWeight: 700 }}>{block.label || blockLabels[block.type]}</Typography>{room ? <Typography variant="caption" component="span" noWrap sx={{ display: "block" }}>{room.residents.primary ?? "Ingen registrerad förstahandshyresgäst"}</Typography> : null}</Button>;
  })}</Box></Paper>;
}

function BlockEditor({ blocks, rooms, templates, pending, onChange, onCancel, onSave }: { blocks: FloorLayoutBlock[]; rooms: RoomView[]; templates: BuildingFloorTemplate[]; pending: boolean; onChange: (blocks: FloorLayoutBlock[]) => void; onCancel: () => void; onSave: () => void }) {
  function applyTemplate(template: BuildingFloorTemplate) {
    let roomIndex = 0;
    onChange(template.blocks.map((block) => block.type === "apartment" ? { ...block, id: crypto.randomUUID(), lagenhetsnummer: rooms[roomIndex]?.lagenhetsnummer, label: rooms[roomIndex++]?.lagenhetsnummer ?? "Ledig plats" } : { ...block, id: crypto.randomUUID() }).filter((block) => block.type !== "apartment" || block.lagenhetsnummer));
  }
  return <Paper variant="outlined" sx={{ p: 2 }}><Stack spacing={2}><Box><Typography variant="h6">Rita våning</Typography><Typography variant="body2" color="text.secondary">Placera block på rutnätet. Dra dem eller använd piltangenterna; storleken ändras med knapparna i blocket.</Typography></Box><FloorBlockGridEditor blocks={blocks} apartmentNumbers={rooms.map((room) => room.lagenhetsnummer)} onChange={onChange} /><FormControl size="small" sx={{ maxWidth: 320 }}><InputLabel id="template-label">Använd planmall</InputLabel><Select labelId="template-label" label="Använd planmall" value="" onChange={(event) => { const template = templates.find((item) => item.id === event.target.value); if (template && window.confirm("Nuvarande osparade ritning ersätts. Fortsätt?")) applyTemplate(template); }}>{templates.map((template) => <MenuItem key={template.id} value={template.id}>{template.name}</MenuItem>)}</Select></FormControl><Stack direction="row" sx={{ justifyContent: "flex-end", gap: 1 }}><Button onClick={onCancel} disabled={pending}>Avbryt</Button><Button variant="contained" onClick={onSave} disabled={pending}>{pending ? "Sparar…" : "Spara ritning"}</Button></Stack></Stack></Paper>;
}

function RoomDialog({ room, onClose }: { room: RoomView | null; onClose: () => void }) { return <Dialog open={!!room} onClose={onClose} fullWidth maxWidth="xs"><DialogTitle>Bostad {room?.lagenhetsnummer}</DialogTitle><DialogContent><Stack spacing={2}>{room && !room.existsInDatabase ? <Alert severity="warning">Lägenhetsnumret saknas i Databas.</Alert> : null}<Box><Typography variant="overline">Förstahandshyresgäst</Typography><Typography>{room?.residents.primary ?? "Ingen registrerad förstahandshyresgäst"}</Typography></Box>{room?.residents.others.map((resident, index) => <Box key={`${resident.name}-${index}`}><Typography variant="overline">{resident.type === "inneboende" ? "Inneboende" : "Andrahandshyresgäst"}</Typography><Typography>{resident.name}</Typography></Box>)}<Chip size="small" sx={{ alignSelf: "flex-start" }} label={room?.residents.matchedBy === "prefix" ? "Matchad efter prefix" : room?.residents.matchedBy === "exact" ? "Exakt matchning" : "Ingen boendematchning"} /></Stack></DialogContent><DialogActions><Button onClick={onClose}>Stäng</Button></DialogActions></Dialog>; }

function FloorDialog({ openFloor, buildingId, pending, onClose, onSave }: { openFloor: FloorView | "new" | null; buildingId: string; pending: boolean; onClose: () => void; onSave: (name: string, series: FloorSeries[], mode: PlacementMode) => void }) {
  const floor = openFloor && openFloor !== "new" ? openFloor : null;
  const [name, setName] = useState(floor?.namn ?? "");
  const [series, setSeries] = useState<FloorSeries[]>(floor?.series ?? [emptySeries]);
  const [mode, setMode] = useState<PlacementMode>(floor?.placementMode ?? "alternating_left");
  const preview = useMemo(() => { try { return placeRooms(generateRoomNumbers(series), mode); } catch { return []; } }, [series, mode]);
  if (!openFloor) return null;
  const resetWarning = !!floor && (JSON.stringify(series) !== JSON.stringify(floor.series) || mode !== floor.placementMode);
  return <Dialog key={`${buildingId}-${floor?.id ?? "new"}`} open fullWidth maxWidth="md" onClose={() => !pending && onClose()}><DialogTitle>{floor ? "Ändra våning" : "Ny våning"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField autoFocus required label="Våningsnamn" value={name} onChange={(event) => setName(event.target.value)} disabled={pending} /><FormControl><InputLabel id="mode-label">Placering</InputLabel><Select labelId="mode-label" label="Placering" value={mode} onChange={(event) => setMode(event.target.value as PlacementMode)} disabled={pending}>{Object.entries(modeLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</Select></FormControl><Alert severity="info">Ange hela nummerserien. Exempel: prefix GH, från 1001, till 1017 ger GH1001–GH1017.</Alert>{series.map((row, index) => <Stack key={index} direction={{ xs: "column", sm: "row" }} sx={{ gap: 1 }}><TextField label="Prefix" placeholder="GH" value={row.prefix} onChange={(event) => setSeries((current) => current.map((item, i) => i === index ? { ...item, prefix: event.target.value, padTo: 0 } : item))} /><TextField label="Från nummer" type="number" placeholder="1001" value={row.start} onChange={(event) => setSeries((current) => current.map((item, i) => i === index ? { ...item, start: Number(event.target.value), padTo: 0 } : item))} /><TextField label="Till nummer" type="number" placeholder="1017" value={row.end} onChange={(event) => setSeries((current) => current.map((item, i) => i === index ? { ...item, end: Number(event.target.value), padTo: 0 } : item))} /><Button color="error" disabled={series.length === 1} onClick={() => setSeries((current) => current.filter((_, i) => i !== index))}>Ta bort</Button></Stack>)}<Button sx={{ alignSelf: "flex-start" }} onClick={() => setSeries((current) => [...current, emptySeries])}>Lägg till serie</Button>{resetWarning ? <Alert severity="warning">När du sparar genereras placeringen om och manuella ändringar återställs.</Alert> : null}<Box><Typography variant="subtitle2">Förhandsgranskning ({preview.length})</Typography><Typography variant="body2" color="text.secondary">{preview.slice(0, 20).map((room) => room.lagenhetsnummer).join(", ")}{preview.length > 20 ? " …" : ""}</Typography></Box></Stack></DialogContent><DialogActions><Button onClick={onClose} disabled={pending}>Avbryt</Button><Button variant="contained" disabled={pending || !name.trim() || preview.length === 0} onClick={() => { if (!resetWarning || window.confirm("Manuell placering återställs. Vill du fortsätta?")) onSave(name, series, mode); }}>{pending ? "Sparar…" : "Spara"}</Button></DialogActions></Dialog>;
}
