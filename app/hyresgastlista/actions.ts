"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { FASTIGHETER } from "@/lib/fastigheter";
import {
  createTenant,
  deleteTenant,
  updateTenant,
  type TenantInput,
} from "@/lib/tenants";

async function requireUser() {
  const session = await auth0.getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
}

function sanitizeInput(input: TenantInput): TenantInput {
  const trimmed: TenantInput = {
    lagenhetsnummer: input.lagenhetsnummer.trim(),
    fastighet: input.fastighet.trim(),
    namn: input.namn.trim(),
    mejladress: input.mejladress.trim(),
    telefonnummer: input.telefonnummer.trim(),
  };

  if (Object.values(trimmed).some((value) => value === "")) {
    throw new Error("Alla fält måste fyllas i.");
  }

  if (!FASTIGHETER.includes(trimmed.fastighet as (typeof FASTIGHETER)[number])) {
    throw new Error("Ogiltig fastighet.");
  }

  return trimmed;
}

export async function createTenantAction(input: TenantInput) {
  await requireUser();
  await createTenant(sanitizeInput(input));
  revalidatePath("/hyresgastlista");
}

export async function updateTenantAction(id: string, input: TenantInput) {
  await requireUser();
  await updateTenant(id, sanitizeInput(input));
  revalidatePath("/hyresgastlista");
}

export async function deleteTenantAction(id: string) {
  await requireUser();
  await deleteTenant(id);
  revalidatePath("/hyresgastlista");
}
