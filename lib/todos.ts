import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

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

type TodoDoc = Omit<Todo, "id"> & { nationsID: string };

async function getCollection() {
  const db = await getDb();
  return db.collection<TodoDoc>("todos");
}

export async function getTodos(nationsId: string): Promise<Todo[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId })
    .sort({ klar: 1, klarDatum: 1 })
    .toArray();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    titel: doc.titel,
    beskrivning: doc.beskrivning ?? "",
    klarDatum: doc.klarDatum,
    prioritet: doc.prioritet,
    tilldeladTill: doc.tilldeladTill,
    tilldeladNamn: doc.tilldeladNamn,
    klar: doc.klar ?? false,
    skapadAv: doc.skapadAv,
    subtasks: doc.subtasks ?? [],
  }));
}

export async function createTodo(
  nationsId: string,
  input: TodoInput,
  skapadAv: string
): Promise<Todo> {
  const col = await getCollection();
  const doc: TodoDoc = { ...input, nationsID: nationsId, klar: false, skapadAv, subtasks: [] };
  const result = await col.insertOne(doc);
  return { ...doc, id: result.insertedId.toString() };
}

export async function updateTodo(nationsId: string, id: string, input: TodoInput): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id), nationsID: nationsId }, { $set: input });
}

export async function setTodoDone(nationsId: string, id: string, klar: boolean): Promise<void> {
  const col = await getCollection();
  await col.updateOne({ _id: new ObjectId(id), nationsID: nationsId }, { $set: { klar } });
}

export async function deleteTodo(nationsId: string, id: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ _id: new ObjectId(id), nationsID: nationsId });
}

// A task with subtasks tracks its own "klar" as derived state: done once
// every subtask is done, undone the moment one isn't. Tasks with no
// subtasks are unaffected — their "klar" stays whatever it was set to
// directly.
async function syncTodoCompletion(nationsId: string, todoId: string): Promise<void> {
  const col = await getCollection();
  const doc = await col.findOne(
    { _id: new ObjectId(todoId), nationsID: nationsId },
    { projection: { subtasks: 1 } }
  );
  if (!doc || doc.subtasks.length === 0) return;
  const allDone = doc.subtasks.every((s) => s.klar);
  await col.updateOne({ _id: new ObjectId(todoId), nationsID: nationsId }, { $set: { klar: allDone } });
}

// Subtasks live embedded on their parent's document — they're always read
// and written together with it, so there's no case that needs them queried
// on their own.
export async function addSubtask(
  nationsId: string,
  todoId: string,
  input: SubtaskInput
): Promise<Subtask> {
  const col = await getCollection();
  const subtask: Subtask = { ...input, id: new ObjectId().toString(), klar: false };
  await col.updateOne(
    { _id: new ObjectId(todoId), nationsID: nationsId },
    { $push: { subtasks: subtask } }
  );
  await syncTodoCompletion(nationsId, todoId);
  return subtask;
}

export async function setSubtaskDone(
  nationsId: string,
  todoId: string,
  subtaskId: string,
  klar: boolean
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(todoId), nationsID: nationsId, "subtasks.id": subtaskId },
    { $set: { "subtasks.$.klar": klar } }
  );
  await syncTodoCompletion(nationsId, todoId);
}

export async function deleteSubtask(nationsId: string, todoId: string, subtaskId: string): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { _id: new ObjectId(todoId), nationsID: nationsId },
    { $pull: { subtasks: { id: subtaskId } } }
  );
  await syncTodoCompletion(nationsId, todoId);
}
