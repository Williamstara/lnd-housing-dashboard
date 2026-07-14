"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { getApartmentById, markAddedToHyresgastlista } from "@/lib/apartments";
import { requireNationsId } from "@/lib/nations";
import { upsertTenantByLagenhetsnummer } from "@/lib/tenants";

async function requireUser(): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return requireNationsId(session.user);
}

// Pushes an archived apartment's tenant over to hyresgästlistan. If that
// apartment number is already listed there, the existing tenant is
// replaced with the new one instead of creating a duplicate row.
export async function addToHyresgastlistaAction(id: string) {
  const nationsId = await requireUser();
  const apartment = await getApartmentById(nationsId, id);

  if (
    !apartment.hyresgastNamn ||
    !apartment.epost ||
    !apartment.telefonnummer
  ) {
    throw new Error("Lägenheten saknar hyresgästinformation.");
  }

  await upsertTenantByLagenhetsnummer(nationsId, {
    lagenhetsnummer: apartment.lagenhetsnummer,
    fastighet: apartment.fastighet,
    namn: apartment.hyresgastNamn,
    personnummer: apartment.personnummer ?? "",
    mejladress: apartment.epost,
    telefonnummer: apartment.telefonnummer,
  });
  await markAddedToHyresgastlista(nationsId, id);

  revalidatePath("/arkiv");
  revalidatePath("/hyresgastlista");
}
