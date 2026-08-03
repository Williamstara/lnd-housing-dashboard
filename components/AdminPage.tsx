"use client";

import { useEffect, useState, useTransition } from "react";
import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  createNationAction,
  getNationSettingsAction,
  saveFastighetAliasesAction,
  saveImportMappingAction,
  saveRentalobjectTabGroupsAction,
  saveRentalobjectsMultiTabAction,
  saveTableColumnsAction,
} from "@/app/admin/actions";
import {
  DEFAULT_ANDRAHANDSGAST_IMPORT,
  DEFAULT_APARTMENT_COLUMNS,
  DEFAULT_BESIKTNING_IMPORT,
  DEFAULT_FASTIGHET_ALIASES,
  DEFAULT_RENTALOBJECT_COLUMNS,
  DEFAULT_RENTALOBJECT_SINGLE_IMPORT,
  DEFAULT_RENTALOBJECT_TAB_GROUPS,
  DEFAULT_TENANT_IMPORT,
  columnIndexToLetter,
  columnLetterToIndex,
  resolveColumns,
  resolveFastighetAliases,
  resolveImportMapping,
  resolveTabGroups,
  type FastighetAlias,
  type ImportFieldConfig,
  type ImportKey,
  type NationSettings,
  type RentalObjectTabGroup,
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
  helperText,
  initialColumns,
}: {
  nationsId: string;
  table: TableKey;
  title: string;
  helperText: string;
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
      <Typography variant="h6" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {helperText}
      </Typography>
      <Stack spacing={0}>
        {columns.map((col, index) => (
          <Stack
            key={col.key}
            direction="row"
            spacing={1.5}
            sx={{
              alignItems: "center",
              py: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
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

// Column position only — the field list itself is fixed by what the parser
// actually reads, so unlike ColumnConfigEditor there's no add/remove/reorder,
// just "which spreadsheet column does each field come from". allowBlank lets
// a field be left empty ("not present on this sheet") instead of requiring
// every field to resolve to a real column — used for rentalobjects, where a
// small nation's sheet may genuinely lack e.g. renoveringsbehov.
function ImportMappingEditor({
  nationsId,
  importKey,
  title,
  initialFields,
  allowBlank = false,
}: {
  nationsId: string;
  importKey: ImportKey;
  title: string;
  initialFields: ImportFieldConfig[];
  allowBlank?: boolean;
}) {
  const [letters, setLetters] = useState<string[]>(() =>
    initialFields.map((f) => columnIndexToLetter(f.column))
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setLetter(index: number, value: string) {
    const upper = value.toUpperCase();
    setLetters((prev) => prev.map((l, i) => (i === index ? upper : l)));
    setSaved(false);
  }

  function handleSave() {
    const resolved: ImportFieldConfig[] = [];
    for (let i = 0; i < initialFields.length; i++) {
      const column = columnLetterToIndex(letters[i] ?? "");
      if (column < 0 && !allowBlank) {
        setError(`Ogiltig kolumnbokstav för "${initialFields[i]!.label}".`);
        return;
      }
      resolved.push({ ...initialFields[i]!, column });
    }
    setError(null);
    startTransition(async () => {
      await saveImportMappingAction(nationsId, importKey, resolved);
      setSaved(true);
    });
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        {title}
      </Typography>
      <Stack spacing={0}>
        {initialFields.map((field, index) => (
          <Stack
            key={field.field}
            direction="row"
            spacing={2}
            sx={{ alignItems: "center", py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <Typography variant="body2" sx={{ flex: 1 }}>
              {field.label}
            </Typography>
            <TextField
              size="small"
              placeholder={allowBlank ? "—" : undefined}
              value={letters[index] ?? ""}
              onChange={(event) => setLetter(index, event.target.value)}
              sx={{ width: 80 }}
            />
          </Stack>
        ))}
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      <Stack direction="row" spacing={2} sx={{ mt: 1.5, alignItems: "center" }}>
        <Button size="small" variant="contained" disabled={isPending} onClick={handleSave}>
          Spara
        </Button>
        {saved && !isPending && (
          <Typography variant="body2" color="success.main">
            Sparat.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

// Maps a raw "Fastighet" spreadsheet value to the registered fastighet name
// it means — shared by every importer that reads a Fastighet column, so it
// lives once here rather than per import mapping.
function FastighetAliasEditor({
  nationsId,
  initialAliases,
}: {
  nationsId: string;
  initialAliases: FastighetAlias[];
}) {
  const [aliases, setAliases] = useState<FastighetAlias[]>(initialAliases);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update(index: number, patch: Partial<FastighetAlias>) {
    setAliases((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
    setSaved(false);
  }

  function remove(index: number) {
    setAliases((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function add() {
    setAliases((prev) => [...prev, { alias: "", fastighet: "" }]);
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveFastighetAliasesAction(
        nationsId,
        aliases.filter((a) => a.alias.trim() && a.fastighet.trim())
      );
      setSaved(true);
    });
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Fastighetsalias
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Om kalkylbladets Fastighet-kolumn stavar en fastighet annorlunda än den registrerade
        namnet (t.ex. förkortningar), mappa den här. Gäller alla Excel-importer.
      </Typography>
      <Stack spacing={0}>
        {aliases.map((a, index) => (
          <Stack
            key={index}
            direction="row"
            spacing={1.5}
            sx={{ alignItems: "center", py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}
          >
            <TextField
              size="small"
              label="Text i kalkylbladet"
              value={a.alias}
              onChange={(event) => update(index, { alias: event.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Registrerad fastighet"
              value={a.fastighet}
              onChange={(event) => update(index, { fastighet: event.target.value })}
              sx={{ flex: 1 }}
            />
            <IconButton size="small" onClick={() => remove(index)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" spacing={2} sx={{ mt: 1.5, alignItems: "center" }}>
        <Button size="small" startIcon={<AddIcon />} onClick={add}>
          Lägg till alias
        </Button>
        <Button size="small" variant="contained" disabled={isPending} onClick={handleSave}>
          Spara
        </Button>
        {saved && !isPending && (
          <Typography variant="body2" color="success.main">
            Sparat.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

const TAB_GROUP_FIELD_TEMPLATE: Array<{ field: string; label: string }> = [
  { field: "fastighet", label: "Fastighet" },
  { field: "lagenhetsnummer", label: "Lägenhetsnummer" },
  { field: "typ", label: "Typ" },
  { field: "area", label: "Area" },
  { field: "areaInkKorr", label: "Area ink korr" },
  { field: "malbildshyra", label: "Målbildshyra" },
  { field: "renoveringsbehov", label: "Renoveringsbehov" },
  { field: "hyresrabatt", label: "Hyresrabatt" },
  { field: "hyresred", label: "Hyresred" },
];

function newTabGroup(index: number): RentalObjectTabGroup {
  return {
    id: `tab_${Date.now()}_${index}`,
    name: `Flik ${index}`,
    matchers: [],
    prefix: "",
    fields: TAB_GROUP_FIELD_TEMPLATE.map((t) => ({ ...t, column: -1 })),
  };
}

// Fully admin-defined: any number of tabs, any name, any set of sheet-name
// matchers, any prefix, any column positions — nothing here is hardcoded to
// one nation's spreadsheet anymore. A blank column means "not on this tab".
function TabGroupsEditor({
  nationsId,
  initialGroups,
}: {
  nationsId: string;
  initialGroups: RentalObjectTabGroup[];
}) {
  const [groups, setGroups] = useState<RentalObjectTabGroup[]>(initialGroups);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateGroup(index: number, patch: Partial<RentalObjectTabGroup>) {
    setGroups((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));
    setSaved(false);
  }

  function setFieldLetter(groupIndex: number, fieldIndex: number, letter: string) {
    const column = columnLetterToIndex(letter);
    setGroups((prev) =>
      prev.map((g, i) =>
        i !== groupIndex
          ? g
          : { ...g, fields: g.fields.map((f, fi) => (fi === fieldIndex ? { ...f, column } : f)) }
      )
    );
    setSaved(false);
  }

  function addGroup() {
    setGroups((prev) => [...prev, newTabGroup(prev.length + 1)]);
    setSaved(false);
  }

  function removeGroup(index: number) {
    setGroups((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveRentalobjectTabGroupsAction(nationsId, groups);
      setSaved(true);
    });
  }

  return (
    <Box>
      {groups.map((group, gi) => (
        <Paper key={group.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 1 }}>
            <TextField
              size="small"
              label="Namn"
              value={group.name}
              onChange={(event) => updateGroup(gi, { name: event.target.value })}
              sx={{ flex: 1 }}
            />
            <TextField
              size="small"
              label="Prefix (valfritt)"
              value={group.prefix}
              onChange={(event) => updateGroup(gi, { prefix: event.target.value })}
              sx={{ width: 140 }}
            />
            <IconButton onClick={() => removeGroup(gi)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
          <TextField
            size="small"
            fullWidth
            label="Fliken matchas om dess namn innehåller (kommaseparerat)"
            value={group.matchers.join(", ")}
            onChange={(event) =>
              updateGroup(gi, {
                matchers: event.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            sx={{ mb: 2 }}
          />
          <Stack spacing={0}>
            {group.fields.map((field, fi) => (
              <Stack
                key={field.field}
                direction="row"
                spacing={2}
                sx={{ alignItems: "center", py: 0.5, borderBottom: "1px solid", borderColor: "divider" }}
              >
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {field.label}
                </Typography>
                <TextField
                  size="small"
                  placeholder="—"
                  value={field.column >= 0 ? columnIndexToLetter(field.column) : ""}
                  onChange={(event) => setFieldLetter(gi, fi, event.target.value)}
                  sx={{ width: 80 }}
                />
              </Stack>
            ))}
          </Stack>
        </Paper>
      ))}
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 2 }}>
        <Button size="small" startIcon={<AddIcon />} onClick={addGroup}>
          Lägg till flik
        </Button>
      </Stack>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
        <Button variant="contained" disabled={isPending} onClick={handleSave}>
          Spara
        </Button>
        {saved && !isPending && (
          <Typography variant="body2" color="success.main">
            Sparat.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

// Most nations keep every rental object on one sheet — multi-tab (an
// admin-defined number of sheets, each matched by name) is the opt-in
// exception, not something with a fixed set of building types baked in.
function DatabasImportSection({
  nationsId,
  initialMultiTab,
  singleFields,
  initialTabGroups,
}: {
  nationsId: string;
  initialMultiTab: boolean;
  singleFields: ImportFieldConfig[];
  initialTabGroups: RentalObjectTabGroup[];
}) {
  const [multiTab, setMultiTab] = useState(initialMultiTab);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggle(value: boolean) {
    setMultiTab(value);
    setSaved(false);
    startTransition(async () => {
      await saveRentalobjectsMultiTabAction(nationsId, value);
      setSaved(true);
    });
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Databas
      </Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", mb: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={multiTab}
              onChange={(event) => handleToggle(event.target.checked)}
              disabled={isPending}
            />
          }
          label="Flera flikar i kalkylbladet"
        />
        {saved && !isPending && (
          <Typography variant="body2" color="success.main">
            Sparat.
          </Typography>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {multiTab
          ? "Varje flik nedan matchas mot fliknamnen i filen och har sin egen kolumnmappning, prefix och namn — lägg till, ta bort eller döp om efter behov."
          : "Standard: all information på ett blad. Rätt val för de allra flesta nationer."}
      </Typography>
      {multiTab ? (
        <TabGroupsEditor nationsId={nationsId} initialGroups={initialTabGroups} />
      ) : (
        <ImportMappingEditor
          nationsId={nationsId}
          importKey="rentalobjects_single"
          title="Kolumner"
          initialFields={singleFields}
          allowBlank
        />
      )}
    </Box>
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
  const [tab, setTab] = useState(0);
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
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        Nationer
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Välj en nation för att anpassa dess tabeller och Excel-import, eller skapa en ny.
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
        <>
          <Divider sx={{ mb: 2 }} />
          <Tabs value={tab} onChange={(_event, value) => setTab(value)} sx={{ mb: 3 }}>
            <Tab label="Kolumner" />
            <Tab label="Import-mappningar" />
          </Tabs>

          {tab === 0 && (
            <Stack spacing={3}>
              <ColumnConfigEditor
                key={`apartments-${selectedNation}`}
                nationsId={selectedNation}
                table="apartments"
                title="Lediga lägenheter"
                helperText="Vilka kolumner som visas i tabellen, i vilken ordning, och deras rubriker. Lägg till egna fält som inte påverkar beräkningar (t.ex. anteckningar)."
                initialColumns={resolveColumns(DEFAULT_APARTMENT_COLUMNS, settings?.tables.apartments)}
              />
              <ColumnConfigEditor
                key={`rentalobjects-${selectedNation}`}
                nationsId={selectedNation}
                table="rentalobjects"
                title="Databas"
                helperText="Samma sak för hyresobjekten i Databas."
                initialColumns={resolveColumns(
                  DEFAULT_RENTALOBJECT_COLUMNS,
                  settings?.tables.rentalobjects
                )}
              />
            </Stack>
          )}

          {tab === 1 && (
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Vilken spreadsheet-kolumn (A, B, C…) varje fält läses från vid Excel-import. Ändra
                här om nationens kalkylblad har en annan kolumnordning.
              </Typography>
              <FastighetAliasEditor
                key={`fastighetalias-${selectedNation}`}
                nationsId={selectedNation}
                initialAliases={resolveFastighetAliases(
                  DEFAULT_FASTIGHET_ALIASES,
                  settings?.fastighetAliases
                )}
              />
              <Divider sx={{ my: 3 }} />
              <ImportMappingEditor
                key={`tenants-${selectedNation}`}
                nationsId={selectedNation}
                importKey="tenants"
                title="Hyresgästlista"
                initialFields={resolveImportMapping(DEFAULT_TENANT_IMPORT, settings?.imports?.tenants).fields}
              />
              <ImportMappingEditor
                key={`andrahandsgaster-${selectedNation}`}
                nationsId={selectedNation}
                importKey="andrahandsgaster"
                title="Andrahandsgäster"
                initialFields={
                  resolveImportMapping(DEFAULT_ANDRAHANDSGAST_IMPORT, settings?.imports?.andrahandsgaster)
                    .fields
                }
              />
              <ImportMappingEditor
                key={`besiktningar-${selectedNation}`}
                nationsId={selectedNation}
                importKey="besiktningar"
                title="Besiktningar"
                initialFields={
                  resolveImportMapping(DEFAULT_BESIKTNING_IMPORT, settings?.imports?.besiktningar).fields
                }
              />
              <Divider sx={{ my: 3 }} />
              <DatabasImportSection
                key={`databas-import-${selectedNation}`}
                nationsId={selectedNation}
                initialMultiTab={settings?.rentalobjectsMultiTab ?? false}
                singleFields={
                  resolveImportMapping(
                    DEFAULT_RENTALOBJECT_SINGLE_IMPORT,
                    settings?.imports?.rentalobjects_single
                  ).fields
                }
                initialTabGroups={resolveTabGroups(
                  DEFAULT_RENTALOBJECT_TAB_GROUPS,
                  settings?.rentalobjectsTabGroups
                )}
              />
            </Paper>
          )}
        </>
      )}
    </Paper>
  );
}
