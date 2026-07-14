import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getBesiktningar } from "@/lib/besiktningar";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import BesiktningarTable from "@/components/BesiktningarTable";

const BesiktningarPage = auth0.withPageAuthRequired(
  async function BesiktningarPage() {
    const session = await auth0.getSession();
    const nationsId = requireNationsIdOrRedirect(session?.user);
    const besiktningar = await getBesiktningar(nationsId);

    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <BesiktningarTable besiktningar={besiktningar} />
      </Container>
    );
  },
  { returnTo: "/besiktningar" }
);

export default BesiktningarPage;
