import "server-only";

type LaundryBuilding = "NATIONSHUSET" | "ARKIVET" | "FINNHUSET";
type Building = "GH" | "NH" | "FH" | "A" | "B" | "C" | "D";

const FASTIGHET_BUILDING: Record<string, Building> = {
  "Gamla huset (223 51, Lund)": "GH",
  "Nya huset (223 51, Lund)": "NH",
  "Finn huset (223 51, Lund)": "FH",
};

const FASTIGHET_LAUNDRY_BUILDING: Record<string, LaundryBuilding> = {
  "Gamla huset (223 51, Lund)": "NATIONSHUSET",
  "Nya huset (223 51, Lund)": "NATIONSHUSET",
  "Finn huset (223 51, Lund)": "FINNHUSET",
  "Arkivet (223 59, Lund)": "ARKIVET",
};

function resolveBuilding(fastighet: string, lagenhetsnummer: string): Building {
  const direct = FASTIGHET_BUILDING[fastighet];
  if (direct) return direct;
  if (fastighet.includes("Arkivet")) {
    const prefix = lagenhetsnummer.charAt(0).toUpperCase();
    if (prefix === "A" || prefix === "B" || prefix === "C" || prefix === "D") {
      return prefix as Building;
    }
    throw new Error(
      `Kan inte avgöra byggnad (A/B/C/D) för lägenhetsnummer "${lagenhetsnummer}". ` +
        `Lägenhetsnumret måste börja med A, B, C eller D.`
    );
  }
  throw new Error(`Okänd fastighet: "${fastighet}"`);
}

function resolveLaundryBuilding(fastighet: string): LaundryBuilding {
  const lb = FASTIGHET_LAUNDRY_BUILDING[fastighet];
  if (!lb) throw new Error(`Ingen tvättstuge-mappning för "${fastighet}".`);
  return lb;
}

async function getMgmtToken(): Promise<string> {
  const domain = process.env.LAUNDRY_AUTH0_DOMAIN;
  const clientId = process.env.LAUNDRY_AUTH0_MGMT_CLIENT_ID;
  const clientSecret = process.env.LAUNDRY_AUTH0_MGMT_CLIENT_SECRET;

  if (!domain || !clientId || !clientSecret) {
    throw new Error("Laundry Auth0-miljövariabler saknas (LAUNDRY_AUTH0_DOMAIN, _CLIENT_ID, _CLIENT_SECRET).");
  }

  const res = await fetch(`https://${domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${domain}/api/v2/`,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Auth0-token misslyckades: ${await res.text()}`);
  }

  return ((await res.json()) as { access_token: string }).access_token;
}

function passwordFromLagenhetsnummer(lagenhetsnummer: string): string {
  return lagenhetsnummer.replace(/\D/g, "");
}

async function findExistingUser(domain: string, token: string, lagenhetsnummer: string): Promise<string | null> {
  const query = encodeURIComponent(`app_metadata.apartment:"${lagenhetsnummer}"`);
  const res = await fetch(`https://${domain}/api/v2/users?q=${query}&search_engine=v3&fields=user_id`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const users = (await res.json()) as Array<{ user_id: string }>;
  return users[0]?.user_id ?? null;
}

// Auth0 dedupes by email within a connection, so a same-email account under
// a *different* apartment (e.g. the tenant moved) would otherwise block
// creation with a 409 even though the apartment-based lookup above found
// nothing — check for it too so it gets replaced the same way.
async function findUserByEmail(domain: string, token: string, email: string): Promise<string | null> {
  const res = await fetch(
    `https://${domain}/api/v2/users-by-email?email=${encodeURIComponent(email)}&fields=user_id`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const users = (await res.json()) as Array<{ user_id: string }>;
  return users[0]?.user_id ?? null;
}

async function deleteUser(domain: string, token: string, userId: string): Promise<void> {
  await fetch(`https://${domain}/api/v2/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export async function createLaundryAccount(
  namn: string,
  mejladress: string,
  telefonnummer: string,
  fastighet: string,
  lagenhetsnummer: string
): Promise<{ userId: string; replaced: boolean }> {
  const domain = process.env.LAUNDRY_AUTH0_DOMAIN!;
  const building = resolveBuilding(fastighet, lagenhetsnummer);
  const laundryBuilding = resolveLaundryBuilding(fastighet);
  const token = await getMgmtToken();

  const existingByApartment = await findExistingUser(domain, token, lagenhetsnummer);
  const existingByEmail = await findUserByEmail(domain, token, mejladress);
  const idsToReplace = new Set(
    [existingByApartment, existingByEmail].filter((id): id is string => !!id)
  );
  for (const id of idsToReplace) {
    await deleteUser(domain, token, id);
  }

  const res = await fetch(`https://${domain}/api/v2/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: lagenhetsnummer,
      email: mejladress,
      connection: process.env.LAUNDRY_AUTH0_CONNECTION ?? "Username-Password-Authentication",
      password: passwordFromLagenhetsnummer(lagenhetsnummer),
      email_verified: false,
      app_metadata: {
        building,
        apartment: lagenhetsnummer,
        laundryBuilding,
        allowedSlots: 2,
        acceptedTerms: false,
        roles: [],
      },
      user_metadata: {
        telephone: telefonnummer,
      },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string; errorCode?: string };
    // Should be rare now that both the apartment- and email-based matches
    // above get replaced first — kept as a fallback for races/edge cases.
    if (res.status === 409 || body.errorCode === "auth0_idp_error" || /already exists/i.test(body.message ?? "")) {
      throw new Error(
        `Det finns redan ett tvättstugekonto med mejladressen ${mejladress}, troligen kopplat till en annan lägenhet. Kontrollera mejladressen, eller ta bort det gamla kontot i tvättstugesystemet och försök igen.`
      );
    }
    throw new Error(body.message ?? `Kontot kunde inte skapas just nu (fel ${res.status}). Försök igen om en stund.`);
  }

  return { userId: ((await res.json()) as { user_id: string }).user_id, replaced: idsToReplace.size > 0 };
}
