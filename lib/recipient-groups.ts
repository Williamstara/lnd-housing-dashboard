import "server-only";
import { getDb } from "@/lib/mongodb";

export type RecipientEntry = { email: string; name: string };

export async function getAllTenantRecipients(): Promise<RecipientEntry[]> {
  const db = await getDb();
  const docs = await db
    .collection("tenants")
    .find({ mejladress: { $exists: true, $ne: "" } })
    .sort({ fastighet: 1, lagenhetsnummer: 1 })
    .toArray();
  return docs.map((d) => ({ email: d.mejladress as string, name: d.namn as string ?? "" }));
}

export async function getTenantRecipientsByFastighet(fastighet: string): Promise<RecipientEntry[]> {
  const db = await getDb();
  const docs = await db
    .collection("tenants")
    .find({ fastighet, mejladress: { $exists: true, $ne: "" } })
    .sort({ lagenhetsnummer: 1 })
    .toArray();
  return docs.map((d) => ({ email: d.mejladress as string, name: d.namn as string ?? "" }));
}

// Tenants with a signed contract moving in on the given date
export async function getInflyttningRecipients(datum: string): Promise<RecipientEntry[]> {
  const db = await getDb();
  const docs = await db
    .collection("apartments")
    .find({
      ledigFrom: datum,
      kontraktSigneratDatum: { $exists: true, $ne: "" },
      epost: { $exists: true, $ne: "" },
    })
    .toArray();
  return docs.map((d) => ({ email: d.epost as string, name: d.hyresgastNamn as string ?? "" }));
}

// Current tenants (from hyresgästlista) in apartments that become available on the given date
export async function getUtflyttningRecipients(datum: string): Promise<RecipientEntry[]> {
  const db = await getDb();
  const apartments = await db
    .collection("apartments")
    .find({ ledigFrom: datum })
    .toArray();
  const lagenhetsnummers = apartments.map((a) => a.lagenhetsnummer as string);
  if (lagenhetsnummers.length === 0) return [];
  const tenants = await db
    .collection("tenants")
    .find({ lagenhetsnummer: { $in: lagenhetsnummers }, mejladress: { $exists: true, $ne: "" } })
    .toArray();
  return tenants.map((t) => ({ email: t.mejladress as string, name: t.namn as string ?? "" }));
}
