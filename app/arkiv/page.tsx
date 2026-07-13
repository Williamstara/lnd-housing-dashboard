import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getArkiv } from "@/lib/apartments";
import ArchiveTable from "@/components/ArchiveTable";

const ArkivPage = auth0.withPageAuthRequired(
  async function ArkivPage() {
    const apartments = await getArkiv();

    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <ArchiveTable apartments={apartments} />
      </Container>
    );
  },
  { returnTo: "/arkiv" }
);

export default ArkivPage;
