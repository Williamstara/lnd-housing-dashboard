import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getFastighetNamn } from "@/lib/fastigheter";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import { getRentalObjects, type RentalObject } from "@/lib/rentalobjects";
import RentalObjectsTable from "@/components/RentalObjectsTable";

async function loadObjects(nationsId: string): Promise<{ objects: RentalObject[]; error?: string }> {
  try {
    return { objects: await getRentalObjects(nationsId) };
  } catch {
    return {
      objects: [],
      error: "Kunde inte hämta hyresobjekt. Kontrollera MongoDB-anslutningen.",
    };
  }
}

const DatabасPage = auth0.withPageAuthRequired(
  async function DatabасPage() {
    const session = await auth0.getSession();
    const nationsId = requireNationsIdOrRedirect(session?.user);
    const [{ objects, error }, fastigheter] = await Promise.all([
      loadObjects(nationsId),
      getFastighetNamn(nationsId),
    ]);

    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        <RentalObjectsTable objects={objects} fastigheter={fastigheter} />
      </Container>
    );
  },
  { returnTo: "/databas" }
);

export default DatabасPage;
