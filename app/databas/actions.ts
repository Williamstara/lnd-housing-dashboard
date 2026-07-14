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
import { FASTIGHETER } from "@/lib/fastigheter";

async function requireUser() {
  const session = await auth0.getSession();
  if (!session?.user) throw new Error("Unauthorized");
}

function validate(input: RentalObjectInput): RentalObjectInput {
  if (!input.lagenhetsnummer.trim()) throw new Error("Lägenhetsnummer krävs.");
  if (!FASTIGHETER.includes(input.fastighet as (typeof FASTIGHETER)[number])) {
    throw new Error("Ogiltig fastighet.");
  }
  return input;
}

export async function createRentalObjectAction(input: RentalObjectInput): Promise<void> {
  await requireUser();
  await createRentalObject(validate(input));
  revalidatePath("/databas");
}

export async function updateRentalObjectAction(id: string, input: RentalObjectInput): Promise<void> {
  await requireUser();
  const validated = validate(input);
  await updateRentalObject(id, validated);
  const area = validated.areaInkKorr ?? validated.area;
  await syncApartmentPricingFromRentalObject(validated.lagenhetsnummer, {
    storlek: area != null ? `${area} m²` : "",
    objekttyp: validated.typ ?? "",
    arshyra: validated.malbildshyra ?? 0,
    hyresreduktion: validated.hyresred ?? 0,
    arshyraMedRed: validated.individuellArshyra ?? 0,
    manadshyra: validated.manadshyra ?? 0,
  });
  revalidatePath("/databas");
  revalidatePath("/lediga-lagenheter");
  revalidatePath("/redo-for-kontrakt");
}

export async function deleteRentalObjectAction(id: string): Promise<void> {
  await requireUser();
  await deleteRentalObject(id);
  revalidatePath("/databas");
}

export async function importRentalObjectsAction(
  rows: RentalObjectInput[]
): Promise<BulkUpsertRentalResult> {
  await requireUser();
  if (rows.length === 0) throw new Error("Inga rader att importera.");
  const result = await bulkUpsertRentalObjects(rows);
  revalidatePath("/databas");
  return result;
}
