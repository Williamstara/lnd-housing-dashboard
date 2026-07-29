import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { auth0 } from "@/lib/auth0";
import { requireAdminOrRedirect } from "@/lib/roles";
import { listAllNationIds } from "@/lib/nation-settings";
import { getUsersWithoutNation } from "@/lib/app-users";
import AdminPage from "@/components/AdminPage";
import AdminUsersPanel from "@/components/AdminUsersPanel";

const Admin = auth0.withPageAuthRequired(
  async function Admin() {
    const session = await auth0.getSession();
    requireAdminOrRedirect(session?.user);

    const [nationIds, usersWithoutNation] = await Promise.all([
      listAllNationIds(),
      getUsersWithoutNation(),
    ]);

    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Stack spacing={4}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Admin
          </Typography>
          <AdminUsersPanel initialUsers={usersWithoutNation} nationIds={nationIds} />
          <AdminPage initialNationIds={nationIds} />
        </Stack>
      </Container>
    );
  },
  { returnTo: "/admin" }
);

export default Admin;
