import Container from "@mui/material/Container";
import { auth } from "@clerk/nextjs/server";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import { DEFAULT_TODO_COLUMNS, getNationSettings, resolveColumns } from "@/lib/nation-settings";
import { getTodos } from "@/lib/todos";
import { getUsersInNation } from "@/lib/app-users";
import TodoList from "@/components/TodoList";

export default async function TodoPage() {
  await auth.protect();
  const nationsId = await requireActiveNationsIdOrRedirect();
  const [todos, users, nationSettings] = await Promise.all([
    getTodos(nationsId),
    getUsersInNation(nationsId),
    getNationSettings(nationsId),
  ]);
  const columnSettings = resolveColumns(DEFAULT_TODO_COLUMNS, nationSettings?.tables.todo);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
      <TodoList todos={todos} users={users} columnSettings={columnSettings} />
    </Container>
  );
}
