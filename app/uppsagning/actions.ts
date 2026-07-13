"use server";

import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { createApartment, findLatestApartmentSpecs } from "@/lib/apartments";
import { ROLES, hasRole } from "@/lib/roles";
import { getTenants } from "@/lib/tenants";
import { createUppsagning } from "@/lib/uppsagningar";

async function requireEkonomiRole() {
  const session = await auth0.getSession();
  if (!session?.user || !hasRole(session.user, ROLES.EKONOMI)) {
    throw new Error("Endast användare med rollen ekonomi har åtkomst.");
  }
}

// Confirms a lease termination: looks up the current tenant in
// hyresgästlistan by apartment number, records the termination, and adds
// the apartment back to lediga lägenheter with the new move-in date.
// Reuses the apartment's most recent known size/rent if it's appeared in
// the apartments store before, since ekonomi only supplies the number and
// the new move-in date here — everything else can be corrected later via
// "Redigera" on Lediga lägenheter if it's changed.
export async function confirmUppsagningAction(
  lagenhetsnummer: string,
  flyttdatum: string
) {
  await requireEkonomiRole();

  const trimmedNummer = lagenhetsnummer.trim();
  const trimmedDatum = flyttdatum.trim();
  if (!trimmedNummer || !trimmedDatum) {
    throw new Error("Alla fält måste fyllas i.");
  }

  const tenants = await getTenants();
  const tenant = tenants.find((t) => t.lagenhetsnummer === trimmedNummer);
  if (!tenant) {
    throw new Error(
      "Ingen hyresgäst hittades för det lägenhetsnumret i hyresgästlistan."
    );
  }

  const bekraftelsedatum = new Date().toISOString().slice(0, 10);

  await createUppsagning({
    lagenhetsnummer: trimmedNummer,
    fastighet: tenant.fastighet,
    hyresgastNamn: tenant.namn,
    bekraftelsedatum,
    flyttdatum: trimmedDatum,
  });

  const existingSpecs = await findLatestApartmentSpecs(trimmedNummer);
  await createApartment({
    lagenhetsnummer: trimmedNummer,
    fastighet: tenant.fastighet,
    storlek: existingSpecs?.storlek ?? "",
    objekttyp: existingSpecs?.objekttyp ?? "",
    antalRum: existingSpecs?.antalRum ?? 0,
    ledigFrom: trimmedDatum,
    arshyra: existingSpecs?.arshyra ?? 0,
    hyresreduktion: existingSpecs?.hyresreduktion ?? 0,
    arshyraMedRed: existingSpecs?.arshyraMedRed ?? 0,
    manadshyra: existingSpecs?.manadshyra ?? 0,
  });

  revalidatePath("/uppsagning");
  revalidatePath("/lediga-lagenheter");
}
