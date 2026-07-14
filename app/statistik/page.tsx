import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getLedigaLagenheter } from "@/lib/apartments";
import { getApartmentsAvailableForManualEntry, getMissedRentRows, syncMissedRent } from "@/lib/missed-rent";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import { getRentalObjects } from "@/lib/rentalobjects";
import {
  getGenerelltSkick,
  getMissedIncomeByYear,
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

    const [rows, rentalObjects, vacantApartments, availableApartments] = await Promise.all([
      getMissedRentRows(nationsId),
      getRentalObjects(nationsId),
      getLedigaLagenheter(nationsId),
      getApartmentsAvailableForManualEntry(nationsId),
    ]);

    return (
      <Container maxWidth="xl" sx={{ py: 6 }}>
        <StatistikOverview
          skick={getGenerelltSkick(rentalObjects)}
          totalaIntakter={getTotalaIntakter(rentalObjects)}
          uthyrningsgrad={getUthyrningsgrad(rentalObjects, vacantApartments, rows)}
          missedIncomeByYear={getMissedIncomeByYear(rows)}
        />
        <MissedRentTable rows={rows} availableApartments={availableApartments} />
      </Container>
    );
  },
  { returnTo: "/statistik" }
);

export default StatistikPage;
