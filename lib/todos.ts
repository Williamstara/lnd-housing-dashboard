import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type TodoPriority = "longterm" | "low" | "mid" | "high";

export type Subtask = {
  id: string;
  titel: string;
  beskrivning: string;
  klarDatum: string;
  prioritet: TodoPriority;
  tilldeladTill: string;
  tilldeladNamn: string;
  klar: boolean;
};

export type SubtaskInput = Omit<Subtask, "id" | "klar">;

export type Todo = {
  id: string;
  titel: string;
  beskrivning: string;
  klarDatum: string;
  prioritet: TodoPriority;
  tilldeladTill: string;
  tilldeladNamn: string;
  klar: boolean;
  skapadAv: string;
  subtasks: Subtask[];
};

export type TodoInput = {
  titel: string;
  beskrivning: string;
  klarDatum: string;
  prioritet: TodoPriority;
  tilldeladTill: string;
  tilldeladNamn: string;
};

type SubtaskRow = {
  id: string;
  titel: string;
  beskrivning: string | null;
  klar_datum: string;
  prioritet: TodoPriority;
  tilldelad_till: string;
  tilldelad_namn: string;
  klar: boolean | null;
};

type TodoRow = {
  id: string;
  titel: string;
  beskrivning: string | null;
  klar_datum: string;
  prioritet: TodoPriority;
  tilldelad_till: string;
  tilldelad_namn: string;
  klar: boolean | null;
  skapad_av: string;
  todo_subtasks: SubtaskRow[];
};

const TODO_COLUMNS =
  "id, titel, beskrivning, klar_datum, prioritet, tilldelad_till, tilldelad_namn, klar, skapad_av, todo_subtasks(id, titel, beskrivning, klar_datum, prioritet, tilldelad_till, tilldelad_namn, klar)" as const;

function mapSubtaskRow(row: SubtaskRow): Subtask {
  return {
    id: row.id,
    titel: row.titel,
    beskrivning: row.beskrivning ?? "",
    klarDatum: row.klar_datum,
    prioritet: row.prioritet,
    tilldeladTill: row.tilldelad_till,
    tilldeladNamn: row.tilldelad_namn,
    klar: row.klar ?? false,
  };
}

function mapRow(row: TodoRow): Todo {
  return {
    id: row.id,
    titel: row.titel,
    beskrivning: row.beskrivning ?? "",
    klarDatum: row.klar_datum,
    prioritet: row.prioritet,
    tilldeladTill: row.tilldelad_till,
    tilldeladNamn: row.tilldelad_namn,
    klar: row.klar ?? false,
    skapadAv: row.skapad_av,
    subtasks: (row.todo_subtasks ?? []).map(mapSubtaskRow),
  };
}

// todo_subtasks has no nations_id of its own (RLS scopes it by joining
// through the parent todo) — this is the app-level counterpart, matching
// every other lib/*.ts file's convention of an explicit nationsId check
// rather than relying on RLS alone.
async function assertTodoInNation(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  nationsId: string,
  todoId: string
): Promise<void> {
  const { data, error } = await supabase
    .from("todos")
    .select("id")
    .eq("id", todoId)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Uppgiften hittades inte.");
}

export async function getTodos(nationsId: string): Promise<Todo[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("todos")
    .select(TODO_COLUMNS)
    .eq("nations_id", nationsId)
    .order("klar", { ascending: true })
    .order("klar_datum", { ascending: true });
  if (error) throw error;
  return (data as unknown as TodoRow[]).map(mapRow);
}

export async function createTodo(
  nationsId: string,
  input: TodoInput,
  skapadAv: string
): Promise<Todo> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("todos")
    .insert({
      nations_id: nationsId,
      titel: input.titel,
      beskrivning: input.beskrivning,
      klar_datum: input.klarDatum,
      prioritet: input.prioritet,
      tilldelad_till: input.tilldeladTill,
      tilldelad_namn: input.tilldeladNamn,
      klar: false,
      skapad_av: skapadAv,
    })
    .select("id, titel, beskrivning, klar_datum, prioritet, tilldelad_till, tilldelad_namn, klar, skapad_av")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    titel: data.titel,
    beskrivning: data.beskrivning ?? "",
    klarDatum: data.klar_datum,
    prioritet: data.prioritet,
    tilldeladTill: data.tilldelad_till,
    tilldeladNamn: data.tilldelad_namn,
    klar: data.klar ?? false,
    skapadAv: data.skapad_av,
    subtasks: [],
  };
}

export async function updateTodo(nationsId: string, id: string, input: TodoInput): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("todos")
    .update({
      titel: input.titel,
      beskrivning: input.beskrivning,
      klar_datum: input.klarDatum,
      prioritet: input.prioritet,
      tilldelad_till: input.tilldeladTill,
      tilldelad_namn: input.tilldeladNamn,
    })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function setTodoDone(nationsId: string, id: string, klar: boolean): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("todos")
    .update({ klar })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function deleteTodo(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("todos")
    .delete()
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

// A task with subtasks tracks its own "klar" as derived state: done once
// every subtask is done, undone the moment one isn't. Tasks with no
// subtasks are unaffected — their "klar" stays whatever it was set to
// directly. This used to be a manual re-check after every subtask mutation
// (syncTodoCompletion); it's now a Postgres trigger (sync_todo_completion,
// supabase/migrations/20260812231459_schema.sql) firing on every
// todo_subtasks insert/klar-update/delete, so no explicit call is needed
// here anymore.
export async function addSubtask(
  nationsId: string,
  todoId: string,
  input: SubtaskInput
): Promise<Subtask> {
  const supabase = createSupabaseServerClient();
  await assertTodoInNation(supabase, nationsId, todoId);

  const { data, error } = await supabase
    .from("todo_subtasks")
    .insert({
      todo_id: todoId,
      titel: input.titel,
      beskrivning: input.beskrivning,
      klar_datum: input.klarDatum,
      prioritet: input.prioritet,
      tilldelad_till: input.tilldeladTill,
      tilldelad_namn: input.tilldeladNamn,
      klar: false,
    })
    .select("id, titel, beskrivning, klar_datum, prioritet, tilldelad_till, tilldelad_namn, klar")
    .single();
  if (error) throw error;
  return mapSubtaskRow(data as SubtaskRow);
}

export async function setSubtaskDone(
  nationsId: string,
  todoId: string,
  subtaskId: string,
  klar: boolean
): Promise<void> {
  const supabase = createSupabaseServerClient();
  await assertTodoInNation(supabase, nationsId, todoId);

  const { error } = await supabase
    .from("todo_subtasks")
    .update({ klar })
    .eq("id", subtaskId)
    .eq("todo_id", todoId);
  if (error) throw error;
}

export async function deleteSubtask(nationsId: string, todoId: string, subtaskId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  await assertTodoInNation(supabase, nationsId, todoId);

  const { error } = await supabase
    .from("todo_subtasks")
    .delete()
    .eq("id", subtaskId)
    .eq("todo_id", todoId);
  if (error) throw error;
}
