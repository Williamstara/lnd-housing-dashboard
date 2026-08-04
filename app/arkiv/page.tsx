import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getArkiv } from "@/lib/apartments";
import { getArkiveradeBesiktningar } from "@/lib/besiktningar";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import ArchiveTable from "@/components/ArchiveTable";
import ArkivBesiktningarTable from "@/components/ArkivBesiktningarTable";

const ArkivPage = auth0.withPageAuthRequired(
  async function ArkivPage() {
    const session = await auth0.getSession();
    const nationsId = requireNationsIdOrRedirect(session?.user);
    const [apartments, besiktningar] = await Promise.all([
      getArkiv(nationsId),
      getArkiveradeBesiktningar(nationsId),
    ]);

    return (
      <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
        <ArchiveTable apartments={apartments} />
        <ArkivBesiktningarTable besiktningar={besiktningar} />
      </Container>
    );
  },
  { returnTo: "/arkiv" }
);

export default ArkivPage;
