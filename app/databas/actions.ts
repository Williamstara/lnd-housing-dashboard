"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import {
  bulkUpsertRentalObjects,
  createRentalObject,
  deleteRentalObject,
  updateRentalObject,
  type BulkUpsertRentalResult,
  type RentalObjectInput,
} from "@/lib/rentalobjects";
import { syncApartmentPricingFromRentalObject } from "@/lib/apartments";
import { getFastighetNamn } from "@/lib/fastigheter";
import { requireNationsId } from "@/lib/nations";

async function requireUser(): Promise<string> {
  const session = await auth0.getSession();
  if (!session?.user) throw new Error("Unauthorized");
  return requireNationsId(session.user);
}

async function validate(nationsId: string, input: RentalObjectInput): Promise<RentalObjectInput> {
  if (!input.lagenhetsnummer.trim()) throw new Error("Lägenhetsnummer krävs.");
  const fastigheter = await getFastighetNamn(nationsId);
  if (!fastigheter.includes(input.fastighet)) {
    throw new Error("Ogiltig fastighet.");
  }
  return input;
}

export async function createRentalObjectAction(input: RentalObjectInput): Promise<void> {
  const nationsId = await requireUser();
  await createRentalObject(nationsId, await validate(nationsId, input));
  revalidatePath("/databas");
}

export async function updateRentalObjectAction(id: string, input: RentalObjectInput): Promise<void> {
  const nationsId = await requireUser();
  const validated = await validate(nationsId, input);
  await updateRentalObject(nationsId, id, validated);
  const area = validated.areaInkKorr ?? validated.area;
  await syncApartmentPricingFromRentalObject(nationsId, validated.lagenhetsnummer, {
    storlek: area != null ? `${area} m²` : "",
    objekttyp: validated.typ ?? "",
    arshyra: validated.malbildshyra ?? 0,
    hyresrabatt: validated.hyresrabatt ?? 0,
    hyresreduktion: validated.hyresred ?? 0,
    arshyraMedRed: validated.individuellArshyra ?? 0,
    manadshyra: validated.manadshyra ?? 0,
  });
  revalidatePath("/databas");
  revalidatePath("/lediga-lagenheter");
  revalidatePath("/redo-for-kontrakt");
}

export async function deleteRentalObjectAction(id: string): Promise<void> {
  const nationsId = await requireUser();
  await deleteRentalObject(nationsId, id);
  revalidatePath("/databas");
}

export async function importRentalObjectsAction(
  rows: RentalObjectInput[]
): Promise<BulkUpsertRentalResult> {
  const nationsId = await requireUser();
  if (rows.length === 0) throw new Error("Inga rader att importera.");
  const result = await bulkUpsertRentalObjects(nationsId, rows);
  revalidatePath("/databas");
  return result;
}
