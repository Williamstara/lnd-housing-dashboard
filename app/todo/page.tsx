import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import { getTodos } from "@/lib/todos";
import { getUsersInNation } from "@/lib/app-users";
import TodoList from "@/components/TodoList";

const TodoPage = auth0.withPageAuthRequired(
  async function TodoPage() {
    const session = await auth0.getSession();
    const nationsId = requireNationsIdOrRedirect(session?.user);
    const [todos, users] = await Promise.all([
      getTodos(nationsId),
      getUsersInNation(nationsId),
    ]);

    return (
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <TodoList todos={todos} users={users} />
      </Container>
    );
  },
  { returnTo: "/todo" }
);

export default TodoPage;
