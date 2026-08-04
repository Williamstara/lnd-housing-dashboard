import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import { getUppsagningar } from "@/lib/uppsagningar";
import { getTenants } from "@/lib/tenants";
import UppsagningTable from "@/components/UppsagningTable";

// Open to every logged-in user — only the "Bekräfta uppsägning" action
// itself is restricted to the ekonomi role (enforced both in the UI and
// server-side in app/uppsagning/actions.ts).
const UppsagningPage = auth0.withPageAuthRequired(
  async function UppsagningPage() {
    const session = await auth0.getSession();
    const nationsId = requireNationsIdOrRedirect(session?.user);
    const [uppsagningar, tenants] = await Promise.all([
      getUppsagningar(nationsId),
      getTenants(nationsId),
    ]);

    return (
      <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
        <UppsagningTable uppsagningar={uppsagningar} tenants={tenants} />
      </Container>
    );
  },
  { returnTo: "/uppsagning" }
);

export default UppsagningPage;
