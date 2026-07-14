import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getTenants, type Tenant } from "@/lib/tenants";
import TenantsTable from "@/components/TenantsTable";

async function loadTenants(): Promise<{ tenants: Tenant[]; error?: string }> {
  try {
    return { tenants: await getTenants() };
  } catch {
    return {
      tenants: [],
      error:
        "Kunde inte hämta hyresgäster. Kontrollera MongoDB-anslutningen (MONGODB_URI / MONGODB_DB).",
    };
  }
}

const HyresgastlistaPage = auth0.withPageAuthRequired(
  async function HyresgastlistaPage() {
    const { tenants, error } = await loadTenants();

    return (
      <Container maxWidth={false} sx={{ py: 6, width: "80%", mx: "auto" }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <TenantsTable tenants={tenants} />
      </Container>
    );
  },
  { returnTo: "/hyresgastlista" }
);

export default HyresgastlistaPage;
