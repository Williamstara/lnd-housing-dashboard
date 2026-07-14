import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getRentalObjects, type RentalObject } from "@/lib/rentalobjects";
import RentalObjectsTable from "@/components/RentalObjectsTable";

async function loadObjects(): Promise<{ objects: RentalObject[]; error?: string }> {
  try {
    return { objects: await getRentalObjects() };
  } catch {
    return {
      objects: [],
      error: "Kunde inte hämta hyresobjekt. Kontrollera MongoDB-anslutningen.",
    };
  }
}

const DatabасPage = auth0.withPageAuthRequired(
  async function DatabасPage() {
    const { objects, error } = await loadObjects();

    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        <RentalObjectsTable objects={objects} />
      </Container>
    );
  },
  { returnTo: "/databas" }
);

export default DatabасPage;
