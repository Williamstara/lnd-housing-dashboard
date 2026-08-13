import Container from "@mui/material/Container";
import { auth0, getCachedSession } from "@/lib/auth0";
import { getArkiv } from "@/lib/apartments";
import { getArkiveradeBesiktningar } from "@/lib/besiktningar";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import { DEFAULT_ARKIV_COLUMNS, getNationSettings, resolveColumns } from "@/lib/nation-settings";
import ArchiveTable from "@/components/ArchiveTable";
import ArkivBesiktningarTable from "@/components/ArkivBesiktningarTable";

const ArkivPage = auth0.withPageAuthRequired(
  async function ArkivPage() {
    const session = await getCachedSession();
    const nationsId = await requireActiveNationsIdOrRedirect(session?.user);
    const [apartments, besiktningar, nationSettings] = await Promise.all([
      getArkiv(nationsId),
      getArkiveradeBesiktningar(nationsId),
      getNationSettings(nationsId),
    ]);
    const columnSettings = resolveColumns(DEFAULT_ARKIV_COLUMNS, nationSettings?.tables.arkiv);

    return (
      <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
        <ArchiveTable apartments={apartments} columnSettings={columnSettings} />
        <ArkivBesiktningarTable besiktningar={besiktningar} />
      </Container>
    );
  },
  { returnTo: "/arkiv" }
);

export default ArkivPage;
