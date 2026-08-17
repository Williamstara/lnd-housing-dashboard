import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import { auth } from "@clerk/nextjs/server";
import { getFastighetNamn } from "@/lib/fastigheter";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import { getNationSettings } from "@/lib/nation-settings";
import {
  DEFAULT_FASTIGHET_ALIASES,
  DEFAULT_RENTALOBJECT_COLUMNS,
  DEFAULT_RENTALOBJECT_SINGLE_IMPORT,
  DEFAULT_RENTALOBJECT_TAB_GROUPS,
  getCurrency,
  getLocale,
  resolveColumns,
  resolveFastighetAliases,
  resolveImportMapping,
  resolveTabGroups,
} from "@/lib/table-columns";
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

export default async function DatabasPage() {
  await auth.protect();
  const nationsId = await requireActiveNationsIdOrRedirect();
  const [{ objects, error }, fastigheter, nationSettings] = await Promise.all([
    loadObjects(nationsId),
    getFastighetNamn(nationsId),
    getNationSettings(nationsId),
  ]);
  const columnSettings = resolveColumns(DEFAULT_RENTALOBJECT_COLUMNS, nationSettings?.tables.rentalobjects);
  const importSingleFields = resolveImportMapping(
    DEFAULT_RENTALOBJECT_SINGLE_IMPORT,
    nationSettings?.imports?.rentalobjects_single
  ).fields;
  const importTabGroups = resolveTabGroups(
    DEFAULT_RENTALOBJECT_TAB_GROUPS,
    nationSettings?.rentalobjectsTabGroups
  );
  const importMultiTab = nationSettings?.rentalobjectsMultiTab ?? false;
  const fastighetAliases = resolveFastighetAliases(
    DEFAULT_FASTIGHET_ALIASES,
    nationSettings?.fastighetAliases
  );

  return (
    <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      <RentalObjectsTable
        objects={objects}
        fastigheter={fastigheter}
        aliases={fastighetAliases}
        columnSettings={columnSettings}
        importSingleFields={importSingleFields}
        importTabGroups={importTabGroups}
        importMultiTab={importMultiTab}
        currency={getCurrency(nationSettings)}
        locale={getLocale(nationSettings)}
      />
    </Container>
  );
}
