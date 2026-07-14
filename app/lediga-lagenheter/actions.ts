"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { getFastighetNamn } from "@/lib/fastigheter";
import { requireNationsId } from "@/lib/nations";
import { ARCHIVE_ROLES, ROLES, getUserDisplayName, hasAnyRole, hasRole } from "@/lib/roles";
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
import { findRentalObjectForApartment, updateRentalObjectPricing } from "@/lib/rentalobjects";

type Actor = { nationsId: string; userName: string };

async function requireUser(): Promise<Actor> {
  const session = await auth0.getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return { nationsId: requireNationsId(session.user), userName: getUserDisplayName(session.user) };
}

async function requireEkonomiRole(): Promise<Actor> {
  const session = await auth0.getSession();
  if (!session?.user || !hasRole(session.user, ROLES.EKONOMI)) {
    throw new Error("Endast användare med rollen ekonomi har åtkomst.");
  }
  return { nationsId: requireNationsId(session.user), userName: getUserDisplayName(session.user) };
}

async function requireHusformanRole(): Promise<Actor> {
  const session = await auth0.getSession();
  if (!session?.user || !hasRole(session.user, ROLES.HUSFORMAN)) {
    throw new Error("Endast användare med rollen husförman har åtkomst.");
  }
  return { nationsId: requireNationsId(session.user), userName: getUserDisplayName(session.user) };
}

async function requireArchiveRole(): Promise<Actor> {
  const session = await auth0.getSession();
  if (!session?.user || !hasAnyRole(session.user, ARCHIVE_ROLES)) {
    throw new Error("Endast användare med rollen ekonomi, husvd eller admin har åtkomst.");
  }
  return { nationsId: requireNationsId(session.user), userName: getUserDisplayName(session.user) };
}

async function sanitizeApartmentInput(nationsId: string, input: ApartmentInput): Promise<ApartmentInput> {
  const trimmed: ApartmentInput = {
    lagenhetsnummer: input.lagenhetsnummer.trim(),
    fastighet: input.fastighet.trim(),
    storlek: input.storlek.trim(),
    objekttyp: input.objekttyp.trim(),
    antalRum: Number(input.antalRum),
    ledigFrom: input.ledigFrom.trim(),
    arshyra: Number(input.arshyra),
    hyresrabatt: Number(input.hyresrabatt),
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

  const fastigheter = await getFastighetNamn(nationsId);
  if (!fastigheter.includes(trimmed.fastighet)) {
    throw new Error("Ogiltig fastighet.");
  }

  if (
    [
      trimmed.antalRum,
      trimmed.arshyra,
      trimmed.hyresrabatt,
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

// Reverse direction of syncApartmentPricingFromRentalObject: when an
// apartment's pricing is edited directly from Lediga lägenheter, push the
// same numbers onto its matching databas entry so the two never drift apart.
async function syncPricingToDatabas(nationsId: string, input: ApartmentInput) {
  const rentalObject = await findRentalObjectForApartment(
    nationsId,
    input.lagenhetsnummer,
    input.fastighet
  );
  if (!rentalObject) return;
  await updateRentalObjectPricing(nationsId, rentalObject.id, {
    malbildshyra: input.arshyra,
    hyresrabatt: input.hyresrabatt,
    hyresred: input.hyresreduktion,
    individuellArshyra: input.arshyraMedRed,
    manadshyra: input.manadshyra,
  });
  revalidatePath("/databas");
}

export async function createApartmentAction(input: ApartmentInput) {
  const { nationsId } = await requireUser();
  const sanitized = await sanitizeApartmentInput(nationsId, input);
  await createApartment(nationsId, sanitized);
  await syncPricingToDatabas(nationsId, sanitized);
  revalidateApartmentPages();
}

export async function updateApartmentAction(
  id: string,
  input: ApartmentInput
) {
  const { nationsId } = await requireUser();
  const sanitized = await sanitizeApartmentInput(nationsId, input);
  await updateApartment(nationsId, id, sanitized);
  await syncPricingToDatabas(nationsId, sanitized);
  revalidateApartmentPages();
}

export async function deleteApartmentAction(id: string) {
  const { nationsId } = await requireUser();
  await deleteApartment(nationsId, id);
  revalidateApartmentPages();
}

export async function markContactedAction(id: string, input: ContactInput) {
  const { nationsId } = await requireUser();
  await markContacted(nationsId, id, sanitizeContactInput(input));
  revalidateApartmentPages();
}

// Only husförman may send a contacted tenant's info over to Redo för kontrakt.
export async function assignTenantAction(
  id: string,
  input: TenantAssignmentInput
) {
  const { nationsId } = await requireHusformanRole();
  await assignTenantAndSendToContract(nationsId, id, sanitizeTenantInput(input));
  revalidateApartmentPages();
}

// Only ekonomi may mark a contract as sent.
export async function markContractSentAction(id: string) {
  const { nationsId, userName } = await requireEkonomiRole();
  await markContractSent(nationsId, id, userName);
  revalidateApartmentPages();
}

// Only husförman may undo a "skicka till kontrakt" (mirrors assignTenantAction).
export async function removeFromKontraktAction(id: string) {
  const { nationsId } = await requireHusformanRole();
  await removeFromKontrakt(nationsId, id);
  revalidateApartmentPages();
}

// Only ekonomi may mark a contract as signed.
export async function markContractSignedAction(id: string) {
  const { nationsId, userName } = await requireEkonomiRole();
  await markContractSigned(nationsId, id, userName);
  revalidateApartmentPages();
}

export async function setHiddenAction(id: string, hidden: boolean) {
  const { nationsId } = await requireUser();
  await setHidden(nationsId, id, hidden);
  revalidateApartmentPages();
}

export async function archiveByLedigFromAction(
  ledigFrom: string
): Promise<{ archived: number; skipped: number }> {
  const { nationsId } = await requireArchiveRole();
  const result = await archiveByLedigFrom(nationsId, ledigFrom);
  revalidateApartmentPages();
  return result;
}
