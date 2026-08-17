import Container from "@mui/material/Container";
import { auth } from "@clerk/nextjs/server";
import { getLedigaLagenheter } from "@/lib/apartments";
import { getFastigheter } from "@/lib/fastigheter";
import { getMissedRentRows, syncMissedRent } from "@/lib/missed-rent";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import { getNationSettings } from "@/lib/nation-settings";
import {
  DEFAULT_APARTMENT_COLUMNS,
  DEFAULT_APARTMENT_IMPORT,
  getCurrency,
  getLocale,
  resolveColumns,
  resolveImportMapping,
} from "@/lib/table-columns";
import ApartmentsTable from "@/components/ApartmentsTable";

export default async function LedigaLagenheterPage() {
  await auth.protect();
  const nationsId = await requireActiveNationsIdOrRedirect();
  await syncMissedRent(nationsId);
  const [apartments, fastighetRecords, missedRent, nationSettings] = await Promise.all([
    getLedigaLagenheter(nationsId),
    getFastigheter(nationsId),
    getMissedRentRows(nationsId),
    getNationSettings(nationsId),
  ]);
  const fastigheter = fastighetRecords.map((f) => f.namn);
  const missedRentApartmentIds = missedRent
    .filter((row) => !row.faktisktInflyttDatum && row.apartmentId)
    .map((row) => row.apartmentId!);
  const columnSettings = resolveColumns(DEFAULT_APARTMENT_COLUMNS, nationSettings?.tables.apartments);
  const importMapping = resolveImportMapping(
    DEFAULT_APARTMENT_IMPORT,
    nationSettings?.imports?.apartments
  ).fields;

  return (
    <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
      <ApartmentsTable
        apartments={apartments}
        fastigheter={fastigheter}
        fastighetPrefixes={fastighetRecords}
        importMapping={importMapping}
        missedRentApartmentIds={missedRentApartmentIds}
        columnSettings={columnSettings}
        enabledFeatures={nationSettings?.enabledFeatures}
        currency={getCurrency(nationSettings)}
        locale={getLocale(nationSettings)}
      />
    </Container>
  );
}
