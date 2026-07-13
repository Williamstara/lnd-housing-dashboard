"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { getApartmentById, markAddedToHyresgastlista } from "@/lib/apartments";
import { upsertTenantByLagenhetsnummer } from "@/lib/tenants";

async function requireUser() {
  const session = await auth0.getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
}

// Pushes an archived apartment's tenant over to hyresgästlistan. If that
// apartment number is already listed there, the existing tenant is
// replaced with the new one instead of creating a duplicate row.
export async function addToHyresgastlistaAction(id: string) {
  await requireUser();
  const apartment = await getApartmentById(id);

  if (
    !apartment.hyresgastNamn ||
    !apartment.epost ||
    !apartment.telefonnummer
  ) {
    throw new Error("Lägenheten saknar hyresgästinformation.");
  }

  await upsertTenantByLagenhetsnummer({
    lagenhetsnummer: apartment.lagenhetsnummer,
    fastighet: apartment.fastighet,
    namn: apartment.hyresgastNamn,
    mejladress: apartment.epost,
    telefonnummer: apartment.telefonnummer,
  });
  await markAddedToHyresgastlista(id);

  revalidatePath("/arkiv");
  revalidatePath("/hyresgastlista");
}
