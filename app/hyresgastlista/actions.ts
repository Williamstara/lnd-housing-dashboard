"use server";

import { revalidatePath } from "next/cache";
import {
  bulkUpsertAndrahandsgaster,
  createAndrahandsgast,
  deleteAndrahandsgast,
  updateAndrahandsgast,
  type AndrahandsgastInput,
  type BulkUpsertAndrahandsgastResult,
} from "@/lib/andrahandsgaster";
import { auth0 } from "@/lib/auth0";
import { getFastighetNamn } from "@/lib/fastigheter";
import { createLaundryAccount } from "@/lib/laundry-account";
import { requireNationsId } from "@/lib/nations";
import {
  bulkUpsertTenants,
  createTenant,
  deleteTenant,
  updateTenant,
  type BulkUpsertResult,
  type TenantInput,
} from "@/lib/tenants";

async function requireUser(): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return requireNationsId(session.user);
}

async function sanitizeInput(nationsId: string, input: TenantInput): Promise<TenantInput> {
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

  const fastigheter = await getFastighetNamn(nationsId);
  if (!fastigheter.includes(trimmed.fastighet)) {
    throw new Error("Ogiltig fastighet.");
  }

  return trimmed;
}

export async function createTenantAction(input: TenantInput) {
  const nationsId = await requireUser();
  await createTenant(nationsId, await sanitizeInput(nationsId, input));
  revalidatePath("/hyresgastlista");
}

export async function updateTenantAction(id: string, input: TenantInput) {
  const nationsId = await requireUser();
  await updateTenant(nationsId, id, await sanitizeInput(nationsId, input));
  revalidatePath("/hyresgastlista");
}

export async function deleteTenantAction(id: string) {
  const nationsId = await requireUser();
  await deleteTenant(nationsId, id);
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
  const nationsId = await requireUser();
  if (rows.length === 0) throw new Error("Inga rader att importera.");
  const fastigheter = await getFastighetNamn(nationsId);
  const sanitized = rows.map((row) => {
    const trimmed: TenantInput = {
      lagenhetsnummer: row.lagenhetsnummer.trim(),
      fastighet: row.fastighet.trim(),
      namn: row.namn.trim(),
      personnummer: row.personnummer.trim(),
      mejladress: row.mejladress.trim(),
      telefonnummer: row.telefonnummer.trim(),
    };
    if (!fastigheter.includes(trimmed.fastighet)) {
      throw new Error(`Okänd fastighet: "${trimmed.fastighet}"`);
    }
    return trimmed;
  });
  const result = await bulkUpsertTenants(nationsId, sanitized);
  revalidatePath("/hyresgastlista");
  return result;
}

async function sanitizeAndrahandsgastInput(
  nationsId: string,
  input: AndrahandsgastInput
): Promise<AndrahandsgastInput> {
  const trimmed: AndrahandsgastInput = {
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

  const fastigheter = await getFastighetNamn(nationsId);
  if (!fastigheter.includes(trimmed.fastighet)) {
    throw new Error("Ogiltig fastighet.");
  }

  return trimmed;
}

export async function createAndrahandsgastAction(input: AndrahandsgastInput) {
  const nationsId = await requireUser();
  await createAndrahandsgast(nationsId, await sanitizeAndrahandsgastInput(nationsId, input));
  revalidatePath("/hyresgastlista");
}

export async function updateAndrahandsgastAction(id: string, input: AndrahandsgastInput) {
  const nationsId = await requireUser();
  await updateAndrahandsgast(nationsId, id, await sanitizeAndrahandsgastInput(nationsId, input));
  revalidatePath("/hyresgastlista");
}

export async function deleteAndrahandsgastAction(id: string) {
  const nationsId = await requireUser();
  await deleteAndrahandsgast(nationsId, id);
  revalidatePath("/hyresgastlista");
}

export async function importAndrahandsgasterFromExcelAction(
  rows: AndrahandsgastInput[]
): Promise<BulkUpsertAndrahandsgastResult> {
  const nationsId = await requireUser();
  if (rows.length === 0) throw new Error("Inga rader att importera.");
  const fastigheter = await getFastighetNamn(nationsId);
  const sanitized = rows.map((row) => {
    const trimmed: AndrahandsgastInput = {
      lagenhetsnummer: row.lagenhetsnummer.trim(),
      fastighet: row.fastighet.trim(),
      namn: row.namn.trim(),
      personnummer: row.personnummer.trim(),
      mejladress: row.mejladress.trim(),
      telefonnummer: row.telefonnummer.trim(),
    };
    if (!fastigheter.includes(trimmed.fastighet)) {
      throw new Error(`Okänd fastighet: "${trimmed.fastighet}"`);
    }
    return trimmed;
  });
  const result = await bulkUpsertAndrahandsgaster(nationsId, sanitized);
  revalidatePath("/hyresgastlista");
  return result;
}

// Andrahandsgäster share a physical apartment with an existing primary
// tenant, so the laundry apartment identifier gets a "b" suffix (e.g.
// "NH1310" -> "NH1310b") to keep their laundry account distinct from the
// primary tenant's — otherwise creating one would silently replace the
// other's account (createLaundryAccount matches/replaces by apartment id).
export async function createAndrahandsgastLaundryAccountAction(data: {
  namn: string;
  mejladress: string;
  telefonnummer: string;
  fastighet: string;
  lagenhetsnummer: string;
}): Promise<{ replaced: boolean }> {
  await requireUser();
  if (!data.mejladress) throw new Error("Andrahandsgästen saknar mejladress.");

  const result = await createLaundryAccount(
    data.namn,
    data.mejladress,
    data.telefonnummer,
    data.fastighet,
    `${data.lagenhetsnummer}b`
  );
  return { replaced: result.replaced };
}
