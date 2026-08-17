import Container from "@mui/material/Container";
import { auth } from "@clerk/nextjs/server";
import { getRedoForKontrakt } from "@/lib/apartments";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import ContractsReadyTable from "@/components/ContractsReadyTable";

export default async function RedoForKontraktPage() {
  await auth.protect();
  const nationsId = await requireActiveNationsIdOrRedirect();
  const apartments = await getRedoForKontrakt(nationsId);

  return (
    <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
      <ContractsReadyTable apartments={apartments} />
    </Container>
  );
}
