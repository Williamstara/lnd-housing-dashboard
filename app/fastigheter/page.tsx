import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getFastigheter } from "@/lib/fastigheter";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import FastigheterTable from "@/components/FastigheterTable";

const FastigheterPage = auth0.withPageAuthRequired(
  async function FastigheterPage() {
    const session = await auth0.getSession();
    const nationsId = requireNationsIdOrRedirect(session?.user);
    const fastigheter = await getFastigheter(nationsId);

    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <FastigheterTable fastigheter={fastigheter} />
      </Container>
    );
  },
  { returnTo: "/fastigheter" }
);

export default FastigheterPage;
