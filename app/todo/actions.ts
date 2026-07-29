"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { requireNationsId } from "@/lib/nations";
import { getUserDisplayName } from "@/lib/roles";
import {
  addSubtask,
  createTodo,
  deleteSubtask,
  deleteTodo,
  setSubtaskDone,
  setTodoDone,
  updateTodo,
  type SubtaskInput,
  type TodoInput,
} from "@/lib/todos";
import { getUsersInNation } from "@/lib/app-users";

async function requireUser(): Promise<{ nationsId: string; userName: string }> {
  const session = await auth0.getSession();
  if (!session?.user) throw new Error("Unauthorized");
  return { nationsId: requireNationsId(session.user), userName: getUserDisplayName(session.user) };
}

async function resolveAssignee(nationsId: string, sub: string) {
  const users = await getUsersInNation(nationsId);
  const assignee = users.find((u) => u.sub === sub);
  if (!assignee) {
    throw new Error("Vald användare hittades inte i din nation.");
  }
  return assignee;
}

async function sanitizeTodoInput(nationsId: string, input: TodoInput): Promise<TodoInput> {
  const titel = input.titel.trim();
  const klarDatum = input.klarDatum.trim();
  if (!titel || !klarDatum || !input.tilldeladTill) {
    throw new Error("Alla fält måste fyllas i.");
  }

  const assignee = await resolveAssignee(nationsId, input.tilldeladTill);
  return {
    titel,
    beskrivning: input.beskrivning.trim(),
    klarDatum,
    prioritet: input.prioritet,
    tilldeladTill: assignee.sub,
    tilldeladNamn: assignee.name,
  };
}

export async function createTodoAction(input: TodoInput) {
  const { nationsId, userName } = await requireUser();
  const sanitized = await sanitizeTodoInput(nationsId, input);
  await createTodo(nationsId, sanitized, userName);
  revalidatePath("/todo");
}

export async function updateTodoAction(id: string, input: TodoInput) {
  const { nationsId } = await requireUser();
  const sanitized = await sanitizeTodoInput(nationsId, input);
  await updateTodo(nationsId, id, sanitized);
  revalidatePath("/todo");
}

export async function setTodoDoneAction(id: string, klar: boolean) {
  const { nationsId } = await requireUser();
  await setTodoDone(nationsId, id, klar);
  revalidatePath("/todo");
}

export async function deleteTodoAction(id: string) {
  const { nationsId } = await requireUser();
  await deleteTodo(nationsId, id);
  revalidatePath("/todo");
}

export async function addSubtaskAction(todoId: string, input: SubtaskInput) {
  const { nationsId } = await requireUser();
  const sanitized = await sanitizeTodoInput(nationsId, input);
  await addSubtask(nationsId, todoId, sanitized);
  revalidatePath("/todo");
}

export async function setSubtaskDoneAction(todoId: string, subtaskId: string, klar: boolean) {
  const { nationsId } = await requireUser();
  await setSubtaskDone(nationsId, todoId, subtaskId, klar);
  revalidatePath("/todo");
}

export async function deleteSubtaskAction(todoId: string, subtaskId: string) {
  const { nationsId } = await requireUser();
  await deleteSubtask(nationsId, todoId, subtaskId);
  revalidatePath("/todo");
}
