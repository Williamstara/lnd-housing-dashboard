import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getLedigaLagenheter } from "@/lib/apartments";
import { getApartmentsAvailableForManualEntry, getMissedRentRows, syncMissedRent } from "@/lib/missed-rent";
import { requireNationsIdOrRedirect } from "@/lib/nations";
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

const StatistikPage = auth0.withPageAuthRequired(
  async function StatistikPage() {
    const session = await auth0.getSession();
    const nationsId = requireNationsIdOrRedirect(session?.user);
    await syncMissedRent(nationsId);

    const [rows, rentalObjects, vacantApartments, availableApartments, tenants, andrahandsgaster] = await Promise.all([
      getMissedRentRows(nationsId),
      getRentalObjects(nationsId),
      getLedigaLagenheter(nationsId),
      getApartmentsAvailableForManualEntry(nationsId),
      getTenants(nationsId),
      getAndrahandsgaster(nationsId),
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
        />
        <MissedRentTable rows={rows} availableApartments={availableApartments} rentalObjects={rentalObjects} />
      </Container>
    );
  },
  { returnTo: "/statistik" }
);

export default StatistikPage;
