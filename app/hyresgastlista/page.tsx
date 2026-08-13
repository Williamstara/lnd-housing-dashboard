import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import { auth0, getCachedSession } from "@/lib/auth0";
import { getAndrahandsgaster } from "@/lib/andrahandsgaster";
import { getFastighetNamn } from "@/lib/fastigheter";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import {
  DEFAULT_ANDRAHANDSGAST_COLUMNS,
  DEFAULT_ANDRAHANDSGAST_IMPORT,
  DEFAULT_FASTIGHET_ALIASES,
  DEFAULT_TENANT_COLUMNS,
  DEFAULT_TENANT_IMPORT,
  getNationSettings,
  resolveColumns,
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
        "Kunde inte hämta hyresgäster. Kontrollera Supabase-anslutningen (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).",
    };
  }
}

const HyresgastlistaPage = auth0.withPageAuthRequired(
  async function HyresgastlistaPage() {
    const session = await getCachedSession();
    const nationsId = await requireActiveNationsIdOrRedirect(session?.user);
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
    const tenantColumns = resolveColumns(DEFAULT_TENANT_COLUMNS, nationSettings?.tables.tenants);
    const andrahandsgastColumns = resolveColumns(
      DEFAULT_ANDRAHANDSGAST_COLUMNS,
      nationSettings?.tables.andrahandsgaster
    );

    return (
      <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
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
          enabledFeatures={nationSettings?.enabledFeatures}
          columnSettings={tenantColumns}
        />
        <AndrahandsgasterTable
          andrahandsgaster={andrahandsgaster}
          fastigheter={fastigheter}
          aliases={fastighetAliases}
          importMapping={andrahandsgastImportMapping}
          enabledFeatures={nationSettings?.enabledFeatures}
          columnSettings={andrahandsgastColumns}
        />
      </Container>
    );
  },
  { returnTo: "/hyresgastlista" }
);

export default HyresgastlistaPage;
