import Container from "@mui/material/Container";
import { auth0, getCachedSession } from "@/lib/auth0";
import { getRedoForKontrakt } from "@/lib/apartments";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import ContractsReadyTable from "@/components/ContractsReadyTable";

const RedoForKontraktPage = auth0.withPageAuthRequired(
  async function RedoForKontraktPage() {
    const session = await getCachedSession();
    const nationsId = await requireActiveNationsIdOrRedirect(session?.user);
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
