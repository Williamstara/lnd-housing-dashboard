"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { FASTIGHETER } from "@/lib/fastigheter";
import { createLaundryAccount } from "@/lib/laundry-account";
import {
  bulkUpsertTenants,
  createTenant,
  deleteTenant,
  updateTenant,
  type BulkUpsertResult,
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
    personnummer: input.personnummer.trim(),
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

export async function createLaundryAccountAction(data: {
  namn: string;
  mejladress: string;
  telefonnummer: string;
  fastighet: string;
  lagenhetsnummer: string;
}): Promise<{ replaced: boolean }> {
  await requireUser();
  if (!data.mejladress) throw new Error("Hyresgästen saknar mejladress.");
  const result = await createLaundryAccount(
    data.namn,
    data.mejladress,
    data.telefonnummer,
    data.fastighet,
    data.lagenhetsnummer
  );
  return { replaced: result.replaced };
}

export async function importTenantsFromExcelAction(
  rows: TenantInput[]
): Promise<BulkUpsertResult> {
  await requireUser();
  if (rows.length === 0) throw new Error("Inga rader att importera.");
  const sanitized = rows.map((row) => {
    const trimmed: TenantInput = {
      lagenhetsnummer: row.lagenhetsnummer.trim(),
      fastighet: row.fastighet.trim(),
      namn: row.namn.trim(),
      personnummer: row.personnummer.trim(),
      mejladress: row.mejladress.trim(),
      telefonnummer: row.telefonnummer.trim(),
    };
    if (!FASTIGHETER.includes(trimmed.fastighet as (typeof FASTIGHETER)[number])) {
      throw new Error(`Okänd fastighet: "${trimmed.fastighet}"`);
    }
    return trimmed;
  });
  const result = await bulkUpsertTenants(sanitized);
  revalidatePath("/hyresgastlista");
  return result;
}
