import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getLedigaLagenheter } from "@/lib/apartments";
import ApartmentsTable from "@/components/ApartmentsTable";

const LedigaLagenheterPage = auth0.withPageAuthRequired(
  async function LedigaLagenheterPage() {
    const apartments = await getLedigaLagenheter();

    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <ApartmentsTable apartments={apartments} />
      </Container>
    );
  },
  { returnTo: "/lediga-lagenheter" }
);

export default LedigaLagenheterPage;
