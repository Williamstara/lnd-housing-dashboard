"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import {
  createManualMissedRent,
  createManualMissedRentFromRentalObject,
  deleteMissedRent,
  updateMissedRent,
  type MissedRentUpdateInput,
} from "@/lib/missed-rent";
import { requireNationsId } from "@/lib/nations";
import { ROLES, hasRole } from "@/lib/roles";

async function requireUser(): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.user) throw new Error("Unauthorized");
  return requireNationsId(session.user);
}

async function requireHusformanRole(): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.user || !hasRole(session.user, ROLES.HUSFORMAN)) {
    throw new Error("Endast användare med rollen husförman har åtkomst.");
  }
  return requireNationsId(session.user);
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
  const nationsId = await requireHusformanRole();
  await deleteMissedRent(nationsId, id);
  revalidatePath("/statistik");
  revalidatePath("/lediga-lagenheter");
}
