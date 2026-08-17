import Container from "@mui/material/Container";
import { auth } from "@clerk/nextjs/server";
import { getBesiktningar } from "@/lib/besiktningar";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import { DEFAULT_BESIKTNING_IMPORT, getNationSettings, resolveImportMapping } from "@/lib/nation-settings";
import BesiktningarTable from "@/components/BesiktningarTable";

export default async function BesiktningarPage() {
  await auth.protect();
  const nationsId = await requireActiveNationsIdOrRedirect();
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
}
