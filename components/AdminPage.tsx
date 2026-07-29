"use client";

import { useEffect, useState, useTransition } from "react";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  createNationAction,
  getNationSettingsAction,
  saveTableColumnsAction,
} from "@/app/admin/actions";
import {
  DEFAULT_APARTMENT_COLUMNS,
  DEFAULT_RENTALOBJECT_COLUMNS,
  resolveColumns,
  type NationSettings,
  type TableColumnConfig,
  type TableKey,
} from "@/lib/table-columns";

function slugify(label: string, existingKeys: Set<string>): string {
  const base =
    label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "falt";
  let key = base;
  let i = 2;
  while (existingKeys.has(key)) {
    key = `${base}_${i}`;
    i++;
  }
  return key;
}

function ColumnConfigEditor({
  nationsId,
  table,
  title,
  initialColumns,
}: {
  nationsId: string;
  table: TableKey;
  title: string;
  initialColumns: TableColumnConfig[];
}) {
  const [columns, setColumns] = useState<TableColumnConfig[]>(initialColumns);
  const [newLabel, setNewLabel] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function move(index: number, dir: -1 | 1) {
    setColumns((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    setSaved(false);
  }

  function toggleVisible(index: number) {
    setColumns((prev) => prev.map((c, i) => (i === index ? { ...c, visible: !c.visible } : c)));
    setSaved(false);
  }

  function setLabel(index: number, label: string) {
    setColumns((prev) => prev.map((c, i) => (i === index ? { ...c, label } : c)));
    setSaved(false);
  }

  function removeCustom(index: number) {
    setColumns((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function addCustomField() {
    const label = newLabel.trim();
    if (!label) return;
    const existingKeys = new Set(columns.map((c) => c.key));
    setColumns((prev) => [
      ...prev,
      { key: slugify(label, existingKeys), label, visible: true, isCustom: true },
    ]);
    setNewLabel("");
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveTableColumnsAction(nationsId, table, columns);
      setSaved(true);
    });
  }

  return (
    <Paper variant="outlined" sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        {title}
      </Typography>
      <Stack spacing={1}>
        {columns.map((col, index) => (
          <Stack key={col.key} direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Stack direction="column">
              <IconButton size="small" disabled={index === 0} onClick={() => move(index, -1)}>
                <ArrowUpwardIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                disabled={index === columns.length - 1}
                onClick={() => move(index, 1)}
              >
                <ArrowDownwardIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Checkbox checked={col.visible} onChange={() => toggleVisible(index)} />
            <TextField
              size="small"
              value={col.label}
              onChange={(event) => setLabel(index, event.target.value)}
              sx={{ flex: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", minWidth: 90 }}>
              {col.isCustom ? "Anpassat fält" : col.key}
            </Typography>
            <IconButton size="small" disabled={!col.isCustom} onClick={() => removeCustom(index)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 2, alignItems: "center" }}>
        <TextField
          size="small"
          label="Nytt anpassat fält"
          value={newLabel}
          onChange={(event) => setNewLabel(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addCustomField();
          }}
        />
        <Button size="small" startIcon={<AddIcon />} onClick={addCustomField}>
          Lägg till fält
        </Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mt: 3, alignItems: "center" }}>
        <Button variant="contained" disabled={isPending} onClick={handleSave}>
          Spara
        </Button>
        {saved && !isPending && (
          <Typography variant="body2" color="success.main">
            Sparat.
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

type Props = { initialNationIds: string[] };

export default function AdminPage({ initialNationIds }: Props) {
  const [nationIds, setNationIds] = useState(initialNationIds);
  const [selectedNation, setSelectedNation] = useState<string | null>(null);
  const [newNationId, setNewNationId] = useState("");
  const [settings, setSettings] = useState<NationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedNation) {
      setSettings(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getNationSettingsAction(selectedNation)
      .then((result) => {
        if (!cancelled) setSettings(result);
      })
      .catch(() => {
        if (!cancelled) setError("Kunde inte hämta inställningar för nationen.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedNation]);

  function handleCreateNation() {
    const trimmed = newNationId.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        await createNationAction(trimmed);
        setNationIds((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed].sort()));
        setSelectedNation(trimmed);
        setNewNationId("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel.");
      }
    });
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Tabellinställningar per nation
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap", alignItems: "center" }}>
        <Autocomplete
          options={nationIds}
          value={selectedNation}
          onChange={(_event, value) => setSelectedNation(value)}
          sx={{ minWidth: 260 }}
          renderInput={(params) => <TextField {...params} label="Nation" />}
        />
        <Typography color="text.secondary">eller</Typography>
        <TextField
          size="small"
          label="Ny nationsID"
          value={newNationId}
          onChange={(event) => setNewNationId(event.target.value)}
        />
        <Button
          variant="outlined"
          disabled={isPending || !newNationId.trim()}
          onClick={handleCreateNation}
        >
          Skapa nation
        </Button>
      </Stack>

      {loading && <Typography color="text.secondary">Laddar…</Typography>}

      {selectedNation && !loading && (
        <Stack spacing={3}>
          <ColumnConfigEditor
            key={`apartments-${selectedNation}`}
            nationsId={selectedNation}
            table="apartments"
            title="Lediga lägenheter — kolumner"
            initialColumns={resolveColumns(DEFAULT_APARTMENT_COLUMNS, settings?.tables.apartments)}
          />
          <ColumnConfigEditor
            key={`rentalobjects-${selectedNation}`}
            nationsId={selectedNation}
            table="rentalobjects"
            title="Databas — kolumner"
            initialColumns={resolveColumns(DEFAULT_RENTALOBJECT_COLUMNS, settings?.tables.rentalobjects)}
          />
        </Stack>
      )}
    </Paper>
  );
}
