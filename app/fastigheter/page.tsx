import Container from "@mui/material/Container";
import { auth } from "@clerk/nextjs/server";
import { getFastigheter } from "@/lib/fastigheter";
import { getBuildingFloorTemplates } from "@/lib/building-floor-templates";
import { getSessionRoles, requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import { getNationRolePermissions } from "@/lib/nation-settings";
import { hasPermission, PERMISSIONS } from "@/lib/roles";
import FastigheterTable from "@/components/FastigheterTable";

export default async function FastigheterPage() {
  await auth.protect();
  const nationsId = await requireActiveNationsIdOrRedirect();
  const [fastigheter, templates, roles, permissions] = await Promise.all([
    getFastigheter(nationsId),
    getBuildingFloorTemplates(nationsId),
    getSessionRoles(),
    getNationRolePermissions(nationsId),
  ]);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
      <FastigheterTable fastigheter={fastigheter} templates={templates} canManage={hasPermission(roles, PERMISSIONS.FASTIGHETER_MANAGE, permissions[PERMISSIONS.FASTIGHETER_MANAGE])} />
    </Container>
  );
}
