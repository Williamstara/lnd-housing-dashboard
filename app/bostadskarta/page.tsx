import Container from "@mui/material/Container";
import { auth } from "@clerk/nextjs/server";
import Bostadskarta from "@/components/Bostadskarta";
import { requireActiveNationsIdOrRedirect, getSessionRoles } from "@/lib/active-nation";
import { getBuildingFloors } from "@/lib/building-floors";
import { getBuildingFloorTemplates } from "@/lib/building-floor-templates";
import { matchResidents } from "@/lib/building-floor-logic";
import { getFastigheter } from "@/lib/fastigheter";
import { getRentalObjects } from "@/lib/rentalobjects";
import { getTenants } from "@/lib/tenants";
import { getAndrahandsgaster } from "@/lib/andrahandsgaster";
import { getNationRolePermissions } from "@/lib/nation-settings";
import { hasPermission, PERMISSIONS } from "@/lib/roles";

export default async function BostadskartaPage() {
  await auth.protect();
  const nationsId = await requireActiveNationsIdOrRedirect();
  const [fastigheter, floors, templates, rentalObjects, tenants, others, roles, permissions] = await Promise.all([
    getFastigheter(nationsId), getBuildingFloors(nationsId), getBuildingFloorTemplates(nationsId), getRentalObjects(nationsId), getTenants(nationsId), getAndrahandsgaster(nationsId), getSessionRoles(), getNationRolePermissions(nationsId),
  ]);
  const rentalNumbers = new Set(rentalObjects.map((item) => `${item.fastighet}\0${item.lagenhetsnummer}`));
  const viewFloors = floors.map((floor) => {
    const building = fastigheter.find((item) => item.id === floor.fastighetId);
    return {
      ...floor,
      rooms: floor.rooms.map((room) => {
        const prefixes = building?.prefixes ?? [];
        const candidates = [room.lagenhetsnummer, ...prefixes.filter((prefix) => room.lagenhetsnummer.startsWith(prefix)).map((prefix) => room.lagenhetsnummer.slice(prefix.length))];
        return { ...room, residents: matchResidents(room.lagenhetsnummer, building?.namn ?? "", prefixes, tenants, others), existsInDatabase: candidates.some((number) => rentalNumbers.has(`${building?.namn ?? ""}\0${number}`)) };
      }),
    };
  });
  return <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}><Bostadskarta fastigheter={fastigheter} floors={viewFloors} templates={templates} canManage={hasPermission(roles, PERMISSIONS.FASTIGHETER_MANAGE, permissions[PERMISSIONS.FASTIGHETER_MANAGE])} /></Container>;
}
