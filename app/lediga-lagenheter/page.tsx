import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getLedigaLagenheter } from "@/lib/apartments";
import { getFastighetNamn } from "@/lib/fastigheter";
import { getMissedRentRows, syncMissedRent } from "@/lib/missed-rent";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import ApartmentsTable from "@/components/ApartmentsTable";

const LedigaLagenheterPage = auth0.withPageAuthRequired(
  async function LedigaLagenheterPage() {
    const session = await auth0.getSession();
    const nationsId = requireNationsIdOrRedirect(session?.user);
    await syncMissedRent(nationsId);
    const [apartments, fastigheter, missedRent] = await Promise.all([
      getLedigaLagenheter(nationsId),
      getFastighetNamn(nationsId),
      getMissedRentRows(nationsId),
    ]);
    const missedRentApartmentIds = missedRent
      .filter((row) => !row.faktisktInflyttDatum)
      .map((row) => row.apartmentId);

    return (
      <Container maxWidth={false} sx={{ py: 6, width: "80%", mx: "auto" }}>
        <ApartmentsTable
          apartments={apartments}
          fastigheter={fastigheter}
          missedRentApartmentIds={missedRentApartmentIds}
        />
      </Container>
    );
  },
  { returnTo: "/lediga-lagenheter" }
);

export default LedigaLagenheterPage;
