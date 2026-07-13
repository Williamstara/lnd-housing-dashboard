"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { FASTIGHETER } from "@/lib/fastigheter";
import { ROLES, hasRole } from "@/lib/roles";
import {
  archiveByLedigFrom,
  assignTenantAndSendToContract,
  createApartment,
  deleteApartment,
  markContacted,
  markContractSent,
  markContractSigned,
  removeFromKontrakt,
  setHidden,
  updateApartment,
  type ApartmentInput,
  type ContactInput,
  type TenantAssignmentInput,
} from "@/lib/apartments";

async function requireUser() {
  const session = await auth0.getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function requireEkonomiRole() {
  const user = await requireUser();
  if (!hasRole(user, ROLES.EKONOMI)) {
    throw new Error("Endast användare med rollen ekonomi har åtkomst.");
  }
}

async function requireAdminRole() {
  const user = await requireUser();
  if (!hasRole(user, ROLES.ADMIN)) {
    throw new Error("Endast användare med rollen admin har åtkomst.");
  }
}

function sanitizeApartmentInput(input: ApartmentInput): ApartmentInput {
  const trimmed: ApartmentInput = {
    lagenhetsnummer: input.lagenhetsnummer.trim(),
    fastighet: input.fastighet.trim(),
    storlek: input.storlek.trim(),
    objekttyp: input.objekttyp.trim(),
    antalRum: Number(input.antalRum),
    ledigFrom: input.ledigFrom.trim(),
    arshyra: Number(input.arshyra),
    hyresreduktion: Number(input.hyresreduktion),
    arshyraMedRed: Number(input.arshyraMedRed),
    manadshyra: Number(input.manadshyra),
  };

  if (
    !trimmed.lagenhetsnummer ||
    !trimmed.storlek ||
    !trimmed.objekttyp ||
    !trimmed.ledigFrom
  ) {
    throw new Error("Alla fält måste fyllas i.");
  }

  if (!FASTIGHETER.includes(trimmed.fastighet as (typeof FASTIGHETER)[number])) {
    throw new Error("Ogiltig fastighet.");
  }

  if (
    [
      trimmed.antalRum,
      trimmed.arshyra,
      trimmed.hyresreduktion,
      trimmed.arshyraMedRed,
      trimmed.manadshyra,
    ].some((value) => Number.isNaN(value) || value < 0)
  ) {
    throw new Error("Numeriska fält måste vara giltiga tal.");
  }

  return trimmed;
}

function sanitizeContactInput(input: ContactInput): ContactInput {
  const trimmed: ContactInput = {
    kontaktperson: input.kontaktperson.trim(),
    svarSenast: input.svarSenast.trim(),
  };
  if (!trimmed.kontaktperson || !trimmed.svarSenast) {
    throw new Error("Alla fält måste fyllas i.");
  }
  return trimmed;
}

function sanitizeTenantInput(
  input: TenantAssignmentInput
): TenantAssignmentInput {
  const trimmed: TenantAssignmentInput = {
    hyresgastNamn: input.hyresgastNamn.trim(),
    personnummer: input.personnummer.trim(),
    epost: input.epost.trim(),
    telefonnummer: input.telefonnummer.trim(),
    kontonummer: input.kontonummer.trim(),
  };
  if (Object.values(trimmed).some((value) => value === "")) {
    throw new Error("Alla fält måste fyllas i.");
  }
  return trimmed;
}

function revalidateApartmentPages() {
  revalidatePath("/lediga-lagenheter");
  revalidatePath("/redo-for-kontrakt");
  revalidatePath("/arkiv");
}

export async function createApartmentAction(input: ApartmentInput) {
  await requireUser();
  await createApartment(sanitizeApartmentInput(input));
  revalidateApartmentPages();
}

export async function updateApartmentAction(
  id: string,
  input: ApartmentInput
) {
  await requireUser();
  await updateApartment(id, sanitizeApartmentInput(input));
  revalidateApartmentPages();
}

export async function deleteApartmentAction(id: string) {
  await requireUser();
  await deleteApartment(id);
  revalidateApartmentPages();
}

export async function markContactedAction(id: string, input: ContactInput) {
  await requireUser();
  await markContacted(id, sanitizeContactInput(input));
  revalidateApartmentPages();
}

// Only admins may send a contacted tenant's info over to Redo för kontrakt.
export async function assignTenantAction(
  id: string,
  input: TenantAssignmentInput
) {
  await requireAdminRole();
  await assignTenantAndSendToContract(id, sanitizeTenantInput(input));
  revalidateApartmentPages();
}

// Only ekonomi may mark a contract as sent.
export async function markContractSentAction(id: string) {
  await requireEkonomiRole();
  await markContractSent(id);
  revalidateApartmentPages();
}

// Only admins may undo a "skicka till kontrakt" (mirrors assignTenantAction).
export async function removeFromKontraktAction(id: string) {
  await requireAdminRole();
  await removeFromKontrakt(id);
  revalidateApartmentPages();
}

export async function markContractSignedAction(id: string) {
  await requireUser();
  await markContractSigned(id);
  revalidateApartmentPages();
}

export async function setHiddenAction(id: string, hidden: boolean) {
  await requireUser();
  await setHidden(id, hidden);
  revalidateApartmentPages();
}

export async function archiveByLedigFromAction(
  ledigFrom: string
): Promise<{ archived: number; skipped: number }> {
  await requireUser();
  const result = await archiveByLedigFrom(ledigFrom);
  revalidateApartmentPages();
  return result;
}
