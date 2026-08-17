"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserDisplayName, getCurrentUserId, requireActiveNationsId } from "@/lib/active-nation";
import { getFastighetNamn } from "@/lib/fastigheter";
import { requirePermission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/roles";
import {
  archiveByLedigFrom,
  assignTenantAndSendToContract,
  bulkUpsertApartments,
  createApartment,
  deleteApartment,
  findLatestApartmentSpecs,
  markContacted,
  markContractSent,
  markContractSigned,
  removeFromKontrakt,
  saveApartmentInterest,
  setHidden,
  setNyckelHamtad,
  setNyckelInlamnad,
  updateApartment,
  type ApartmentImportInput,
  type ApartmentInput,
  type ApartmentSpecs,
  type TenantAssignmentInput,
} from "@/lib/apartments";
import {
  findRentalObjectByLagenhetsnummer,
  findRentalObjectForApartment,
  rentalObjectToApartmentSpecs,
  updateRentalObjectPricing,
} from "@/lib/rentalobjects";

type Actor = { nationsId: string; userName: string };

async function requireUser(): Promise<Actor> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  return { nationsId: await requireActiveNationsId(), userName: await getCurrentUserDisplayName() };
}

async function requireEkonomiRole(): Promise<Actor> {
  return requirePermission(
    PERMISSIONS.LEDIGA_LAGENHETER_MANAGE_TENANT,
    "Endast användare med rollen ekonomi har åtkomst."
  );
}

async function requireHusformanRole(): Promise<Actor> {
  return requirePermission(
    PERMISSIONS.LEDIGA_LAGENHETER_MANAGE_FASTIGHET,
    "Endast användare med rollen husförman har åtkomst."
  );
}

async function requireArchiveRole(): Promise<Actor> {
  return requirePermission(
    PERMISSIONS.LEDIGA_LAGENHETER_ARCHIVE,
    "Endast användare med rollen ekonomi, husvd eller admin har åtkomst."
  );
}

// fastigheter can be pre-fetched by a caller that already has the list (the
// Excel-import loop below) to avoid re-querying it once per row — matches
// importTenantsFromExcelAction's existing pattern (app/hyresgastlista/actions.ts).
async function sanitizeApartmentInput(
  nationsId: string,
  input: ApartmentInput,
  fastigheter?: string[]
): Promise<ApartmentInput> {
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
    custom: input.custom,
  };

  if (
    !trimmed.lagenhetsnummer ||
    !trimmed.storlek ||
    !trimmed.objekttyp ||
    !trimmed.ledigFrom
  ) {
    throw new Error("Alla fält måste fyllas i.");
  }

  const knownFastigheter = fastigheter ?? (await getFastighetNamn(nationsId));
  if (!knownFastigheter.includes(trimmed.fastighet)) {
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

function trimTenantInput(input: TenantAssignmentInput): TenantAssignmentInput {
  return {
    hyresgastNamn: input.hyresgastNamn.trim(),
    personnummer: input.personnummer.trim(),
    epost: input.epost.trim(),
    telefonnummer: input.telefonnummer.trim(),
    kontonummer: input.kontonummer.trim(),
  };
}

function sanitizeTenantInput(
  input: TenantAssignmentInput
): TenantAssignmentInput {
  const trimmed = trimTenantInput(input);
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

// Looks up the "Hämta från databas" specs for a lägenhetsnummer: prefers the
// databas (rentalobjects), falling back to the most recent apartment record
// with the same number, same as the automatic uppsägning flow does.
export async function lookupApartmentSpecsAction(
  lagenhetsnummer: string
): Promise<ApartmentSpecs | null> {
  const { nationsId } = await requireUser();
  const trimmed = lagenhetsnummer.trim();
  if (!trimmed) return null;

  const rentalObject = await findRentalObjectByLagenhetsnummer(nationsId, trimmed);
  if (rentalObject) return rentalObjectToApartmentSpecs(rentalObject);

  const existing = await findLatestApartmentSpecs(nationsId, trimmed);
  if (!existing) return null;
  return {
    fastighet: existing.fastighet,
    storlek: existing.storlek,
    objekttyp: existing.objekttyp,
    antalRum: existing.antalRum,
    arshyra: existing.arshyra,
    hyresrabatt: existing.hyresrabatt,
    hyresreduktion: existing.hyresreduktion,
    arshyraMedRed: existing.arshyraMedRed,
    manadshyra: existing.manadshyra,
  };
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

// Sanitizes each row independently so one bad row (typo'd fastighet, garbage
// number) doesn't drop the rest of an otherwise-good import. Interest fields
// (hyresgästnamn etc.) are trimmed but never required — a sheet without them
// still imports fine.
export async function importApartmentsFromExcelAction(
  rows: ApartmentImportInput[]
): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
  skippedDetails: Array<{ lagenhetsnummer: string; reason: string }>;
}> {
  const { nationsId } = await requireUser();
  if (rows.length === 0) throw new Error("Inga rader att importera.");
  const fastigheter = await getFastighetNamn(nationsId);
  const sanitized: ApartmentImportInput[] = [];
  const skippedDetails: Array<{ lagenhetsnummer: string; reason: string }> = [];
  for (const row of rows) {
    try {
      const specs = await sanitizeApartmentInput(nationsId, row, fastigheter);
      sanitized.push({
        ...specs,
        hyresgastNamn: row.hyresgastNamn?.trim() || undefined,
        personnummer: row.personnummer?.trim() || undefined,
        epost: row.epost?.trim() || undefined,
        telefonnummer: row.telefonnummer?.trim() || undefined,
        kontonummer: row.kontonummer?.trim() || undefined,
      });
    } catch (err) {
      skippedDetails.push({
        lagenhetsnummer: row.lagenhetsnummer,
        reason: err instanceof Error ? err.message : "Okänt fel.",
      });
    }
  }
  const result = await bulkUpsertApartments(nationsId, sanitized);
  revalidateApartmentPages();
  return { ...result, skipped: skippedDetails.length, skippedDetails };
}

export async function deleteApartmentAction(id: string) {
  const { nationsId } = await requireUser();
  await deleteApartment(nationsId, id);
  revalidateApartmentPages();
}

// Persists whatever interest/contract fields are filled in so far — no
// completeness check and no status change, so a name can be saved on its
// own without triggering an email or a "redo för kontrakt" transition.
export async function saveApartmentInterestAction(
  id: string,
  input: TenantAssignmentInput
) {
  const { nationsId } = await requireUser();
  await saveApartmentInterest(nationsId, id, trimTenantInput(input));
  revalidateApartmentPages();
}

// Persists the current form state and marks the apartment "kontaktad" with
// the given reply-by date. The dialog sends the actual e-post afterwards via
// /api/send-mail.
export async function sendApartmentContactEmailInfoAction(
  id: string,
  input: TenantAssignmentInput,
  svarSenast: string
) {
  const { nationsId } = await requireUser();
  const trimmed = trimTenantInput(input);
  const svarSenastTrimmed = svarSenast.trim();
  if (!trimmed.hyresgastNamn || !trimmed.epost || !svarSenastTrimmed) {
    throw new Error("Namn, e-post och svarsdatum måste fyllas i.");
  }
  await saveApartmentInterest(nationsId, id, trimmed);
  await markContacted(nationsId, id, {
    kontaktperson: trimmed.hyresgastNamn,
    svarSenast: svarSenastTrimmed.split("T")[0]!,
  });
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

export async function setNyckelInlamnadAction(id: string, value: boolean) {
  const { nationsId } = await requireUser();
  await setNyckelInlamnad(nationsId, id, value);
  revalidateApartmentPages();
}

export async function setNyckelHamtadAction(id: string, value: boolean) {
  const { nationsId } = await requireUser();
  await setNyckelHamtad(nationsId, id, value);
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
