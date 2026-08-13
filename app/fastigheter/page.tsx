import Container from "@mui/material/Container";
import { auth0, getCachedSession } from "@/lib/auth0";
import { getFastigheter } from "@/lib/fastigheter";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import FastigheterTable from "@/components/FastigheterTable";

const FastigheterPage = auth0.withPageAuthRequired(
  async function FastigheterPage() {
    const session = await getCachedSession();
    const nationsId = await requireActiveNationsIdOrRedirect(session?.user);
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
