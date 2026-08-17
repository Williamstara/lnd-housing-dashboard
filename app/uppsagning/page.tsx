import Container from "@mui/material/Container";
import { auth } from "@clerk/nextjs/server";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import { DEFAULT_UPPSAGNING_COLUMNS, getNationSettings, resolveColumns } from "@/lib/nation-settings";
import { getUppsagningar } from "@/lib/uppsagningar";
import { getTenants } from "@/lib/tenants";
import UppsagningTable from "@/components/UppsagningTable";

// Open to every logged-in user — only the "Bekräfta uppsägning" action
// itself is restricted to the ekonomi role (enforced both in the UI and
// server-side in app/uppsagning/actions.ts).
export default async function UppsagningPage() {
  await auth.protect();
  const nationsId = await requireActiveNationsIdOrRedirect();
  const [uppsagningar, tenants, nationSettings] = await Promise.all([
    getUppsagningar(nationsId),
    getTenants(nationsId),
    getNationSettings(nationsId),
  ]);
  const columnSettings = resolveColumns(DEFAULT_UPPSAGNING_COLUMNS, nationSettings?.tables.uppsagning);

  return (
    <Container maxWidth={false} sx={{ py: { xs: 3, md: 4 } }}>
      <UppsagningTable uppsagningar={uppsagningar} tenants={tenants} columnSettings={columnSettings} />
    </Container>
  );
}
