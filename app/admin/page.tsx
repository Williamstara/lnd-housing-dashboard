import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { auth } from "@clerk/nextjs/server";
import { getSessionRoles } from "@/lib/active-nation";
import { requireAdminOrRedirect } from "@/lib/roles";
import { listAllNationIds } from "@/lib/nation-settings";
import { getAvailableRoles, getUsersWithoutNation } from "@/lib/app-users";
import AdminShell from "@/components/AdminShell";

export default async function Admin() {
  await auth.protect();
  requireAdminOrRedirect(await getSessionRoles());

  const [nationIds, usersWithoutNation, availableRoles] = await Promise.all([
    listAllNationIds(),
    getUsersWithoutNation(),
    getAvailableRoles(),
  ]);

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 3 }}>
        Admin
      </Typography>
      <AdminShell
        initialNationIds={nationIds}
        initialUsers={usersWithoutNation}
        availableRoles={availableRoles}
      />
    </Container>
  );
}
