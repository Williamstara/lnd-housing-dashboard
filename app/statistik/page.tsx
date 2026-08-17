import Container from "@mui/material/Container";
import { auth } from "@clerk/nextjs/server";
import { getLedigaLagenheter } from "@/lib/apartments";
import { getApartmentsAvailableForManualEntry, getMissedRentRows, syncMissedRent } from "@/lib/missed-rent";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import { getNationSettings } from "@/lib/nation-settings";
import { getRentalObjects } from "@/lib/rentalobjects";
import { getTenants } from "@/lib/tenants";
import { getAndrahandsgaster } from "@/lib/andrahandsgaster";
import {
  getBestandsoversikt,
  getGenerelltSkick,
  getLagenheterPerStatus,
  getMissedIncomeByYear,
  getMissedRentByAnsvarig,
  getTotalaIntakter,
  getUthyrningsgrad,
} from "@/lib/statistik";
import MissedRentTable from "@/components/MissedRentTable";
import StatistikOverview from "@/components/StatistikOverview";

export default async function StatistikPage() {
  await auth.protect();
  const nationsId = await requireActiveNationsIdOrRedirect();
  await syncMissedRent(nationsId);

  const [rows, rentalObjects, vacantApartments, availableApartments, tenants, andrahandsgaster, nationSettings] =
    await Promise.all([
      getMissedRentRows(nationsId),
      getRentalObjects(nationsId),
      getLedigaLagenheter(nationsId),
      getApartmentsAvailableForManualEntry(nationsId),
      getTenants(nationsId),
      getAndrahandsgaster(nationsId),
      getNationSettings(nationsId),
    ]);

  return (
    <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
      <StatistikOverview
        skick={getGenerelltSkick(rentalObjects)}
        totalaIntakter={getTotalaIntakter(rentalObjects)}
        uthyrningsgrad={getUthyrningsgrad(rentalObjects, vacantApartments, rows)}
        missedIncomeByYear={getMissedIncomeByYear(rows)}
        missedRentByAnsvarig={getMissedRentByAnsvarig(rows)}
        bestandsoversikt={getBestandsoversikt(rentalObjects, tenants, andrahandsgaster)}
        lagenheterPerStatus={getLagenheterPerStatus(vacantApartments)}
        nationSettings={nationSettings}
      />
      <MissedRentTable
        rows={rows}
        availableApartments={availableApartments}
        rentalObjects={rentalObjects}
        nationSettings={nationSettings}
      />
    </Container>
  );
}
