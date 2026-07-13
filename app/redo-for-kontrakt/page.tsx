import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getRedoForKontrakt } from "@/lib/apartments";
import ContractsReadyTable from "@/components/ContractsReadyTable";

const RedoForKontraktPage = auth0.withPageAuthRequired(
  async function RedoForKontraktPage() {
    const apartments = await getRedoForKontrakt();

    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <ContractsReadyTable apartments={apartments} />
      </Container>
    );
  },
  { returnTo: "/redo-for-kontrakt" }
);

export default RedoForKontraktPage;
