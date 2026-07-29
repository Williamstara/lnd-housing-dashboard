import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getFastighetNamn } from "@/lib/fastigheter";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import { getNationSettings } from "@/lib/nation-settings";
import { DEFAULT_RENTALOBJECT_COLUMNS, resolveColumns } from "@/lib/table-columns";
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
    const [{ objects, error }, fastigheter, nationSettings] = await Promise.all([
      loadObjects(nationsId),
      getFastighetNamn(nationsId),
      getNationSettings(nationsId),
    ]);
    const columnSettings = resolveColumns(DEFAULT_RENTALOBJECT_COLUMNS, nationSettings?.tables.rentalobjects);

    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        <RentalObjectsTable objects={objects} fastigheter={fastigheter} columnSettings={columnSettings} />
      </Container>
    );
  },
  { returnTo: "/databas" }
);

export default DatabасPage;
