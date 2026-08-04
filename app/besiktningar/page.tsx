import Container from "@mui/material/Container";
import { auth0 } from "@/lib/auth0";
import { getBesiktningar } from "@/lib/besiktningar";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import { DEFAULT_BESIKTNING_IMPORT, getNationSettings, resolveImportMapping } from "@/lib/nation-settings";
import BesiktningarTable from "@/components/BesiktningarTable";

const BesiktningarPage = auth0.withPageAuthRequired(
  async function BesiktningarPage() {
    const session = await auth0.getSession();
    const nationsId = requireNationsIdOrRedirect(session?.user);
    const [besiktningar, nationSettings] = await Promise.all([
      getBesiktningar(nationsId),
      getNationSettings(nationsId),
    ]);
    const importMapping = resolveImportMapping(
      DEFAULT_BESIKTNING_IMPORT,
      nationSettings?.imports?.besiktningar
    ).fields;

    return (
      <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
        <BesiktningarTable besiktningar={besiktningar} importMapping={importMapping} />
      </Container>
    );
  },
  { returnTo: "/besiktningar" }
);

export default BesiktningarPage;
