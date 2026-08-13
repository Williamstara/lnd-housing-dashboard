import Container from "@mui/material/Container";
import { auth0, getCachedSession } from "@/lib/auth0";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import { DEFAULT_TODO_COLUMNS, getNationSettings, resolveColumns } from "@/lib/nation-settings";
import { getTodos } from "@/lib/todos";
import { getUsersInNation } from "@/lib/app-users";
import TodoList from "@/components/TodoList";

const TodoPage = auth0.withPageAuthRequired(
  async function TodoPage() {
    const session = await getCachedSession();
    const nationsId = await requireActiveNationsIdOrRedirect(session?.user);
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
  },
  { returnTo: "/todo" }
);

export default TodoPage;
