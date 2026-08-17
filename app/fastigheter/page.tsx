import Container from "@mui/material/Container";
import { auth } from "@clerk/nextjs/server";
import { getFastigheter } from "@/lib/fastigheter";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import FastigheterTable from "@/components/FastigheterTable";

export default async function FastigheterPage() {
  await auth.protect();
  const nationsId = await requireActiveNationsIdOrRedirect();
  const fastigheter = await getFastigheter(nationsId);

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <FastigheterTable fastigheter={fastigheter} />
    </Container>
  );
}
