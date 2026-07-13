import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getUppsagningar } from "@/lib/uppsagningar";
import { getTenants } from "@/lib/tenants";
import UppsagningTable from "@/components/UppsagningTable";

// Open to every logged-in user — only the "Bekräfta uppsägning" action
// itself is restricted to the ekonomi role (enforced both in the UI and
// server-side in app/uppsagning/actions.ts).
const UppsagningPage = auth0.withPageAuthRequired(
  async function UppsagningPage() {
    const [uppsagningar, tenants] = await Promise.all([
      getUppsagningar(),
      getTenants(),
    ]);

    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <UppsagningTable uppsagningar={uppsagningar} tenants={tenants} />
      </Container>
    );
  },
  { returnTo: "/uppsagning" }
);

export default UppsagningPage;
