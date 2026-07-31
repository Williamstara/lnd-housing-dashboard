"use client";

import { Fragment, useState, useTransition, type ChangeEvent, type SyntheticEvent } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  addSubtaskAction,
  createTodoAction,
  deleteSubtaskAction,
  deleteTodoAction,
  setSubtaskDoneAction,
  setTodoDoneAction,
  updateTodoAction,
} from "@/app/todo/actions";
import type { AppUser } from "@/lib/app-users";
import type { Subtask, Todo, TodoPriority } from "@/lib/todos";
import ColumnVisibilityMenu from "@/components/ColumnVisibilityMenu";
import { useColumnVisibility } from "@/lib/use-column-visibility";

type ColumnKey = "titel" | "prioritet" | "klarDatum" | "tilldelad";

const columns: Array<{ key: ColumnKey; label: string }> = [
  { key: "titel", label: "Uppgift" },
  { key: "prioritet", label: "Prioritet" },
  { key: "klarDatum", label: "Klart senast" },
  { key: "tilldelad", label: "Tilldelad" },
];

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  longterm: "Långsiktig",
  low: "Låg",
  mid: "Medel",
  high: "Hög",
};

// MUI's own chip colors already cover what was asked for — grey (default),
// green (success), orange (warning), red (error) — no custom palette needed.
const PRIORITY_COLORS: Record<
  TodoPriority,
  "default" | "success" | "warning" | "error"
> = {
  longterm: "default",
  low: "success",
  mid: "warning",
  high: "error",
};

type Props = {
  todos: Todo[];
  users: AppUser[];
};

function userLabel(user: AppUser): string {
  return user.email ? `${user.name} (${user.email})` : user.name;
}

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

type TaskFormValues = {
  titel: string;
  beskrivning: string;
  klarDatum: string;
  prioritet: TodoPriority;
  assignee: AppUser | null;
};

type TaskSubmitValues = Omit<TaskFormValues, "assignee"> & { assignee: AppUser };

function emptyFormValues(): TaskFormValues {
  return { titel: "", beskrivning: "", klarDatum: "", prioritet: "mid", assignee: null };
}

function todoToFormValues(todo: Todo, users: AppUser[]): TaskFormValues {
  return {
    titel: todo.titel,
    beskrivning: todo.beskrivning,
    klarDatum: todo.klarDatum,
    prioritet: todo.prioritet,
    assignee: users.find((u) => u.sub === todo.tilldeladTill) ?? null,
  };
}

// Shared by "Lägg till uppgift", "Lägg till deluppgift" and "Redigera
// uppgift" — same fields, only the submit handler, title and initial
// values differ.
function TaskFormDialog({
  open,
  title,
  users,
  initialValues,
  submitLabel = "Lägg till",
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  users: AppUser[];
  initialValues?: TaskFormValues;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: TaskSubmitValues) => Promise<void>;
}) {
  const [values, setValues] = useState<TaskFormValues>(() => initialValues ?? emptyFormValues());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setValues(initialValues ?? emptyFormValues());
    setError(null);
    onClose();
  }

  function handleSubmit() {
    if (!values.titel.trim() || !values.klarDatum || !values.assignee) {
      setError("Alla fält måste fyllas i.");
      return;
    }
    const assignee = values.assignee;
    setError(null);
    startTransition(async () => {
      try {
        await onSubmit({ ...values, assignee });
        handleClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Något gick fel. Försök igen.");
      }
    });
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Titel"
            value={values.titel}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setValues((v) => ({ ...v, titel: event.target.value }))
            }
            disabled={isPending}
            fullWidth
          />
          <TextField
            label="Beskrivning"
            value={values.beskrivning}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setValues((v) => ({ ...v, beskrivning: event.target.value }))
            }
            disabled={isPending}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Klart senast"
            type="date"
            value={values.klarDatum}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setValues((v) => ({ ...v, klarDatum: event.target.value }))
            }
            disabled={isPending}
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
          />
          <TextField
            select
            label="Prioritet"
            value={values.prioritet}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setValues((v) => ({ ...v, prioritet: event.target.value as TodoPriority }))
            }
            disabled={isPending}
            fullWidth
          >
            {(Object.keys(PRIORITY_LABELS) as TodoPriority[]).map((key) => (
              <MenuItem key={key} value={key}>
                <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                  <Chip label="" color={PRIORITY_COLORS[key]} size="small" sx={{ width: 16, height: 16 }} />
                  {PRIORITY_LABELS[key]}
                </Stack>
              </MenuItem>
            ))}
          </TextField>
          <Autocomplete
            options={users}
            getOptionLabel={userLabel}
            isOptionEqualToValue={(option, value) => option.sub === value.sub}
            value={values.assignee}
            onChange={(_event: SyntheticEvent, newValue: AppUser | null) =>
              setValues((v) => ({ ...v, assignee: newValue }))
            }
            disabled={isPending}
            renderInput={(params) => <TextField {...params} label="Tilldela till" />}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isPending}>
          Avbryt
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isPending}>
          {submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function TodoList({ todos, users }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [addSubtaskFor, setAddSubtaskFor] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { isVisible, toggle } = useColumnVisibility("todo");
  const visibleColumnDefs = columns.filter((c) => isVisible(c.key));

  function toggleDone(todo: Todo) {
    startTransition(async () => {
      await setTodoDoneAction(todo.id, !todo.klar);
    });
  }

  function handleDelete(todo: Todo) {
    if (!confirm(`Ta bort uppgiften "${todo.titel}"?`)) return;
    startTransition(async () => {
      await deleteTodoAction(todo.id);
    });
  }

  function toggleSubtaskDone(todoId: string, subtask: Subtask) {
    startTransition(async () => {
      await setSubtaskDoneAction(todoId, subtask.id, !subtask.klar);
    });
  }

  function handleDeleteSubtask(todoId: string, subtask: Subtask) {
    if (!confirm(`Ta bort deluppgiften "${subtask.titel}"?`)) return;
    startTransition(async () => {
      await deleteSubtaskAction(todoId, subtask.id);
    });
  }

  function renderCellValue(todo: Todo, key: ColumnKey) {
    if (key === "titel") return todo.titel;
    if (key === "prioritet") {
      return (
        <Chip
          label={PRIORITY_LABELS[todo.prioritet]}
          color={PRIORITY_COLORS[todo.prioritet]}
          size="small"
        />
      );
    }
    if (key === "klarDatum") return todo.klarDatum;
    return todo.tilldeladNamn;
  }

  return (
    <>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2, flexWrap: "wrap" }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Todo-lista
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          Lägg till uppgift
        </Button>
      </Stack>

      <Box sx={{ display: { xs: "none", sm: "block" } }}>
      <TableContainer component={Paper}>
        <Table aria-label="Todo-lista">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <ColumnVisibilityMenu columns={columns} isVisible={isVisible} onToggle={toggle} />
              </TableCell>
              <TableCell padding="checkbox" />
              <TableCell padding="checkbox" />
              {visibleColumnDefs.map((column) => (
                <TableCell key={column.key}>{column.label}</TableCell>
              ))}
              <TableCell align="right">Åtgärder</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {todos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumnDefs.length + 4} align="center">
                  Inga uppgifter än.
                </TableCell>
              </TableRow>
            ) : (
              todos.map((todo) => {
                const expanded = expandedTasks.has(todo.id);
                return (
                  <Fragment key={todo.id}>
                    <TableRow
                      hover
                      onClick={() => setExpandedTasks((prev) => toggleInSet(prev, todo.id))}
                      sx={[{ cursor: "pointer" }, todo.klar ? { opacity: 0.5 } : null]}
                    >
                      <TableCell padding="checkbox" />
                      <TableCell padding="checkbox">
                        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </TableCell>
                      <TableCell padding="checkbox" onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={todo.klar}
                          onChange={() => toggleDone(todo)}
                          disabled={isPending}
                        />
                      </TableCell>
                      {visibleColumnDefs.map((column) => (
                        <TableCell
                          key={column.key}
                          sx={
                            column.key === "titel" && todo.klar
                              ? { textDecoration: "line-through" }
                              : undefined
                          }
                        >
                          {renderCellValue(todo, column.key)}
                        </TableCell>
                      ))}
                      <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                        <IconButton
                          aria-label="Redigera"
                          size="small"
                          disabled={isPending}
                          onClick={() => setEditingTodo(todo)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          aria-label="Ta bort"
                          size="small"
                          disabled={isPending}
                          onClick={() => handleDelete(todo)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={visibleColumnDefs.length + 4} sx={{ py: 0 }}>
                        <Collapse in={expanded} unmountOnExit>
                          <Box sx={{ py: 2, pl: 6, pr: 2 }}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ whiteSpace: "pre-wrap", mb: 2 }}
                            >
                              {todo.beskrivning || "Ingen beskrivning."}
                            </Typography>

                            {todo.subtasks.length > 0 && (
                              <Stack spacing={0} sx={{ mb: 1 }}>
                                {todo.subtasks.map((subtask) => {
                                  const subExpanded = expandedSubtasks.has(subtask.id);
                                  return (
                                    <Box
                                      key={subtask.id}
                                      sx={{ borderBottom: "1px solid", borderColor: "divider" }}
                                    >
                                      <Stack
                                        direction="row"
                                        spacing={1}
                                        onClick={() =>
                                          setExpandedSubtasks((prev) => toggleInSet(prev, subtask.id))
                                        }
                                        sx={{ alignItems: "center", cursor: "pointer", py: 0.5 }}
                                      >
                                        <Checkbox
                                          size="small"
                                          checked={subtask.klar}
                                          onClick={(event) => event.stopPropagation()}
                                          onChange={() => toggleSubtaskDone(todo.id, subtask)}
                                          disabled={isPending}
                                        />
                                        <Typography
                                          variant="body2"
                                          sx={[
                                            { flex: 1 },
                                            subtask.klar ? { textDecoration: "line-through", opacity: 0.6 } : null,
                                          ]}
                                        >
                                          {subtask.titel}
                                        </Typography>
                                        <Chip
                                          label={PRIORITY_LABELS[subtask.prioritet]}
                                          color={PRIORITY_COLORS[subtask.prioritet]}
                                          size="small"
                                        />
                                        <Typography variant="body2" color="text.secondary" sx={{ width: 100 }}>
                                          {subtask.klarDatum}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary" sx={{ width: 140 }}>
                                          {subtask.tilldeladNamn}
                                        </Typography>
                                        <IconButton
                                          aria-label="Ta bort deluppgift"
                                          size="small"
                                          disabled={isPending}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            handleDeleteSubtask(todo.id, subtask);
                                          }}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Stack>
                                      <Collapse in={subExpanded} unmountOnExit>
                                        <Typography
                                          variant="body2"
                                          color="text.secondary"
                                          sx={{ whiteSpace: "pre-wrap", pl: 5, pb: 1 }}
                                        >
                                          {subtask.beskrivning || "Ingen beskrivning."}
                                        </Typography>
                                      </Collapse>
                                    </Box>
                                  );
                                })}
                              </Stack>
                            )}

                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => setAddSubtaskFor(todo.id)}
                            >
                              Lägg till deluppgift
                            </Button>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      </Box>

      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 1 }}>
          <ColumnVisibilityMenu columns={columns} isVisible={isVisible} onToggle={toggle} />
        </Stack>
        {todos.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
            Inga uppgifter än.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {todos.map((todo) => {
              const expanded = expandedTasks.has(todo.id);
              return (
                <Card key={todo.id} variant="outlined" sx={todo.klar ? { opacity: 0.6 } : undefined}>
                  <CardContent sx={{ "&:last-child": { pb: 2 } }}>
                    <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, mb: 1 }}>
                      <Checkbox
                        checked={todo.klar}
                        onChange={() => toggleDone(todo)}
                        disabled={isPending}
                        sx={{ ml: -1 }}
                      />
                      <Box sx={{ flex: 1 }} />
                      <IconButton
                        aria-label="Redigera"
                        size="small"
                        disabled={isPending}
                        onClick={() => setEditingTodo(todo)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="Ta bort"
                        size="small"
                        disabled={isPending}
                        onClick={() => handleDelete(todo)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label={expanded ? "Dölj detaljer" : "Visa detaljer"}
                        size="small"
                        onClick={() => setExpandedTasks((prev) => toggleInSet(prev, todo.id))}
                      >
                        {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                    </Stack>

                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 1 }}>
                      {visibleColumnDefs.map((column) => (
                        <Box key={column.key} sx={{ minWidth: 0 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {column.label}
                          </Typography>
                          <Box
                            sx={{
                              textDecoration: column.key === "titel" && todo.klar ? "line-through" : undefined,
                              overflowWrap: "break-word",
                            }}
                          >
                            {renderCellValue(todo, column.key)}
                          </Box>
                        </Box>
                      ))}
                    </Box>

                    <Collapse in={expanded} unmountOnExit>
                      <Box sx={{ mt: 2 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ whiteSpace: "pre-wrap", mb: 2 }}
                        >
                          {todo.beskrivning || "Ingen beskrivning."}
                        </Typography>

                        {todo.subtasks.length > 0 && (
                          <Stack spacing={0} sx={{ mb: 1 }}>
                            {todo.subtasks.map((subtask) => {
                              const subExpanded = expandedSubtasks.has(subtask.id);
                              return (
                                <Box
                                  key={subtask.id}
                                  sx={{ borderBottom: "1px solid", borderColor: "divider", py: 0.5 }}
                                >
                                  <Stack
                                    direction="row"
                                    spacing={1}
                                    onClick={() =>
                                      setExpandedSubtasks((prev) => toggleInSet(prev, subtask.id))
                                    }
                                    sx={{ alignItems: "center", cursor: "pointer" }}
                                  >
                                    <Checkbox
                                      size="small"
                                      checked={subtask.klar}
                                      onClick={(event) => event.stopPropagation()}
                                      onChange={() => toggleSubtaskDone(todo.id, subtask)}
                                      disabled={isPending}
                                    />
                                    <Typography
                                      variant="body2"
                                      sx={[
                                        { flex: 1 },
                                        subtask.klar ? { textDecoration: "line-through", opacity: 0.6 } : null,
                                      ]}
                                    >
                                      {subtask.titel}
                                    </Typography>
                                    <Chip
                                      label={PRIORITY_LABELS[subtask.prioritet]}
                                      color={PRIORITY_COLORS[subtask.prioritet]}
                                      size="small"
                                    />
                                    <IconButton
                                      aria-label="Ta bort deluppgift"
                                      size="small"
                                      disabled={isPending}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleDeleteSubtask(todo.id, subtask);
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Stack>
                                  <Stack direction="row" sx={{ gap: 2, pl: 5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      {subtask.klarDatum}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {subtask.tilldeladNamn}
                                    </Typography>
                                  </Stack>
                                  <Collapse in={subExpanded} unmountOnExit>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ whiteSpace: "pre-wrap", pl: 5, pb: 1 }}
                                    >
                                      {subtask.beskrivning || "Ingen beskrivning."}
                                    </Typography>
                                  </Collapse>
                                </Box>
                              );
                            })}
                          </Stack>
                        )}

                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          onClick={() => setAddSubtaskFor(todo.id)}
                        >
                          Lägg till deluppgift
                        </Button>
                      </Box>
                    </Collapse>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>

      <TaskFormDialog
        open={addOpen}
        title="Lägg till uppgift"
        users={users}
        onClose={() => setAddOpen(false)}
        onSubmit={(values) =>
          createTodoAction({
            titel: values.titel,
            beskrivning: values.beskrivning,
            klarDatum: values.klarDatum,
            prioritet: values.prioritet,
            tilldeladTill: values.assignee.sub,
            tilldeladNamn: values.assignee.name,
          })
        }
      />

      <TaskFormDialog
        open={addSubtaskFor !== null}
        title="Lägg till deluppgift"
        users={users}
        onClose={() => setAddSubtaskFor(null)}
        onSubmit={(values) => {
          if (!addSubtaskFor) return Promise.resolve();
          return addSubtaskAction(addSubtaskFor, {
            titel: values.titel,
            beskrivning: values.beskrivning,
            klarDatum: values.klarDatum,
            prioritet: values.prioritet,
            tilldeladTill: values.assignee.sub,
            tilldeladNamn: values.assignee.name,
          });
        }}
      />

      <TaskFormDialog
        key={editingTodo?.id ?? "no-edit"}
        open={editingTodo !== null}
        title="Redigera uppgift"
        submitLabel="Spara"
        users={users}
        initialValues={editingTodo ? todoToFormValues(editingTodo, users) : undefined}
        onClose={() => setEditingTodo(null)}
        onSubmit={(values) => {
          if (!editingTodo) return Promise.resolve();
          return updateTodoAction(editingTodo.id, {
            titel: values.titel,
            beskrivning: values.beskrivning,
            klarDatum: values.klarDatum,
            prioritet: values.prioritet,
            tilldeladTill: values.assignee.sub,
            tilldeladNamn: values.assignee.name,
          });
        }}
      />
    </>
  );
}
