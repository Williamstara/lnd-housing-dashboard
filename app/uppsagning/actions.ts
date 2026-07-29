"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { createApartment, findLatestApartmentSpecs, type ApartmentInput } from "@/lib/apartments";
import { createBesiktning } from "@/lib/besiktningar";
import { requireNationsId } from "@/lib/nations";
import { ROLES, getUserDisplayName, hasRole } from "@/lib/roles";
import { getTenants } from "@/lib/tenants";
import { createUppsagning } from "@/lib/uppsagningar";
import { findRentalObjectForApartment, type RentalObject } from "@/lib/rentalobjects";

async function requireEkonomiRole(): Promise<{ nationsId: string; userName: string }> {
  const session = await auth0.getSession();
  if (!session?.user || !hasRole(session.user, ROLES.EKONOMI)) {
    throw new Error("Endast användare med rollen ekonomi har åtkomst.");
  }
  return { nationsId: requireNationsId(session.user), userName: getUserDisplayName(session.user) };
}

function rentalObjectToApartmentInput(
  ro: RentalObject,
  lagenhetsnummer: string,
  fastighet: string,
  ledigFrom: string
): ApartmentInput {
  const area = ro.areaInkKorr ?? ro.area;
  return {
    lagenhetsnummer,
    fastighet,
    storlek: area != null ? `${area} m²` : "",
    objekttyp: ro.typ ?? "",
    antalRum: 0,
    ledigFrom,
    arshyra: ro.malbildshyra ?? 0,
    hyresrabatt: ro.hyresrabatt ?? 0,
    hyresreduktion: ro.hyresred ?? 0,
    arshyraMedRed: ro.individuellArshyra ?? 0,
    manadshyra: ro.manadshyra ?? 0,
  };
}

// Confirms a lease termination: records the termination in uppsägningar,
// then adds the apartment to lediga lägenheter. Specs are pulled from the
// databas (rentalobjects) when a match is found, with a fallback to the
// apartment's most recent entry in the apartments store.
export async function confirmUppsagningAction(
  lagenhetsnummer: string,
  flyttdatum: string,
  dokument: File
) {
  const { nationsId, userName } = await requireEkonomiRole();

  const trimmedNummer = lagenhetsnummer.trim();
  const trimmedDatum = flyttdatum.trim();
  if (!trimmedNummer || !trimmedDatum) {
    throw new Error("Alla fält måste fyllas i.");
  }
  if (!dokument || dokument.size === 0) {
    throw new Error("En fil måste bifogas.");
  }

  const tenants = await getTenants(nationsId);
  const tenant = tenants.find((t) => t.lagenhetsnummer === trimmedNummer);
  if (!tenant) {
    throw new Error(
      "Ingen hyresgäst hittades för det lägenhetsnumret i hyresgästlistan."
    );
  }

  const bekraftelsedatum = new Date().toISOString().slice(0, 10);
  const dokumentBuffer = Buffer.from(await dokument.arrayBuffer());

  await createUppsagning(nationsId, {
    lagenhetsnummer: trimmedNummer,
    fastighet: tenant.fastighet,
    hyresgastNamn: tenant.namn,
    bekraftelsedatum,
    bekraftadAv: userName,
    flyttdatum: trimmedDatum,
    dokument: {
      data: dokumentBuffer,
      contentType: dokument.type || "application/octet-stream",
      filename: dokument.name,
    },
  });

  const rentalObject = await findRentalObjectForApartment(nationsId, trimmedNummer, tenant.fastighet);

  let apartmentInput: ApartmentInput;
  if (rentalObject) {
    apartmentInput = rentalObjectToApartmentInput(
      rentalObject,
      trimmedNummer,
      tenant.fastighet,
      trimmedDatum
    );
  } else {
    const existingSpecs = await findLatestApartmentSpecs(nationsId, trimmedNummer);
    apartmentInput = {
      lagenhetsnummer: trimmedNummer,
      fastighet: tenant.fastighet,
      storlek: existingSpecs?.storlek ?? "",
      objekttyp: existingSpecs?.objekttyp ?? "",
      antalRum: existingSpecs?.antalRum ?? 0,
      ledigFrom: trimmedDatum,
      arshyra: existingSpecs?.arshyra ?? 0,
      hyresrabatt: existingSpecs?.hyresrabatt ?? 0,
      hyresreduktion: existingSpecs?.hyresreduktion ?? 0,
      arshyraMedRed: existingSpecs?.arshyraMedRed ?? 0,
      manadshyra: existingSpecs?.manadshyra ?? 0,
    };
  }

  await createApartment(nationsId, apartmentInput);
  await createBesiktning(nationsId, trimmedNummer, trimmedDatum);

  revalidatePath("/uppsagning");
  revalidatePath("/lediga-lagenheter");
  revalidatePath("/besiktningar");
}
