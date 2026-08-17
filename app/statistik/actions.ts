"use server";

import { revalidatePath } from "next/cache";
import {
  createManualMissedRent,
  createManualMissedRentFromRentalObject,
  deleteMissedRent,
  updateMissedRent,
  type MissedRentUpdateInput,
} from "@/lib/missed-rent";
import { getCurrentUserId, requireActiveNationsId } from "@/lib/active-nation";
import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/roles";

async function requireUser(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Unauthorized");
  return await requireActiveNationsId();
}

export async function createManualMissedRentAction(apartmentId: string) {
  const nationsId = await requireUser();
  await createManualMissedRent(nationsId, apartmentId);
  revalidatePath("/statistik");
  revalidatePath("/lediga-lagenheter");
}

export async function createManualMissedRentFromRentalObjectAction(
  rentalObjectId: string,
  missedSince: string
) {
  const nationsId = await requireUser();
  const trimmed = missedSince.trim();
  if (!trimmed) throw new Error("Datum för missad hyra krävs.");
  await createManualMissedRentFromRentalObject(nationsId, rentalObjectId, trimmed);
  revalidatePath("/statistik");
  revalidatePath("/databas");
}

export async function updateMissedRentAction(id: string, input: MissedRentUpdateInput) {
  const nationsId = await requireUser();
  await updateMissedRent(nationsId, id, input);
  revalidatePath("/statistik");
  revalidatePath("/lediga-lagenheter");
}

export async function deleteMissedRentAction(id: string) {
  const { nationsId } = await requirePermission(
    PERMISSIONS.STATISTIK_MANAGE_MISSED_RENT,
    "Endast användare med rollen husförman har åtkomst."
  );
  await deleteMissedRent(nationsId, id);
  revalidatePath("/statistik");
  revalidatePath("/lediga-lagenheter");
}
