import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getAndrahandsgaster } from "@/lib/andrahandsgaster";
import { getFastighetNamn } from "@/lib/fastigheter";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import {
  DEFAULT_ANDRAHANDSGAST_IMPORT,
  DEFAULT_FASTIGHET_ALIASES,
  DEFAULT_TENANT_IMPORT,
  getNationSettings,
  resolveFastighetAliases,
  resolveImportMapping,
} from "@/lib/nation-settings";
import { getTenants, type Tenant } from "@/lib/tenants";
import AndrahandsgasterTable from "@/components/AndrahandsgasterTable";
import TenantsTable from "@/components/TenantsTable";

async function loadTenants(nationsId: string): Promise<{ tenants: Tenant[]; error?: string }> {
  try {
    return { tenants: await getTenants(nationsId) };
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
    const session = await auth0.getSession();
    const nationsId = requireNationsIdOrRedirect(session?.user);
    const [{ tenants, error }, fastigheter, andrahandsgaster, nationSettings] = await Promise.all([
      loadTenants(nationsId),
      getFastighetNamn(nationsId),
      getAndrahandsgaster(nationsId),
      getNationSettings(nationsId),
    ]);
    const tenantImportMapping = resolveImportMapping(
      DEFAULT_TENANT_IMPORT,
      nationSettings?.imports?.tenants
    ).fields;
    const andrahandsgastImportMapping = resolveImportMapping(
      DEFAULT_ANDRAHANDSGAST_IMPORT,
      nationSettings?.imports?.andrahandsgaster
    ).fields;
    const fastighetAliases = resolveFastighetAliases(
      DEFAULT_FASTIGHET_ALIASES,
      nationSettings?.fastighetAliases
    );

    return (
      <Container maxWidth={false} sx={{ py: 6, width: "80%", mx: "auto" }}>
        {error && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <TenantsTable
          tenants={tenants}
          fastigheter={fastigheter}
          aliases={fastighetAliases}
          importMapping={tenantImportMapping}
        />
        <AndrahandsgasterTable
          andrahandsgaster={andrahandsgaster}
          fastigheter={fastigheter}
          aliases={fastighetAliases}
          importMapping={andrahandsgastImportMapping}
        />
      </Container>
    );
  },
  { returnTo: "/hyresgastlista" }
);

export default HyresgastlistaPage;
