import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getRedoForKontrakt } from "@/lib/apartments";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import ContractsReadyTable from "@/components/ContractsReadyTable";

const RedoForKontraktPage = auth0.withPageAuthRequired(
  async function RedoForKontraktPage() {
    const session = await auth0.getSession();
    const nationsId = requireNationsIdOrRedirect(session?.user);
    const apartments = await getRedoForKontrakt(nationsId);

    return (
      <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
        <ContractsReadyTable apartments={apartments} />
      </Container>
    );
  },
  { returnTo: "/redo-for-kontrakt" }
);

export default RedoForKontraktPage;
