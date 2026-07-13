import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type Tenant = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  mejladress: string;
  telefonnummer: string;
};

export type TenantInput = {
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  mejladress: string;
  telefonnummer: string;
};

type TenantDocument = TenantInput;

async function getTenantsCollection() {
  const db = await getDb();
  return db.collection<TenantDocument>("tenants");
}

export async function getTenants(): Promise<Tenant[]> {
  const collection = await getTenantsCollection();
  const docs = await collection
    .find()
    .sort({ fastighet: 1, lagenhetsnummer: 1 })
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    lagenhetsnummer: doc.lagenhetsnummer,
    fastighet: doc.fastighet,
    namn: doc.namn,
    mejladress: doc.mejladress,
    telefonnummer: doc.telefonnummer,
  }));
}

export async function createTenant(input: TenantInput): Promise<string> {
  const collection = await getTenantsCollection();
  const result = await collection.insertOne(input);
  return result.insertedId.toString();
}

export async function updateTenant(
  id: string,
  input: TenantInput
): Promise<void> {
  const collection = await getTenantsCollection();
  await collection.updateOne({ _id: new ObjectId(id) }, { $set: input });
}

export async function deleteTenant(id: string): Promise<void> {
  const collection = await getTenantsCollection();
  await collection.deleteOne({ _id: new ObjectId(id) });
}

// Replaces whoever is currently listed for this apartment number, or
// inserts a new row if nobody is. Used when pushing a signed contract's
// tenant over from the archive.
export async function upsertTenantByLagenhetsnummer(
  input: TenantInput
): Promise<{ replaced: boolean }> {
  const collection = await getTenantsCollection();
  const result = await collection.updateOne(
    { lagenhetsnummer: input.lagenhetsnummer },
    { $set: input },
    { upsert: true }
  );
  return { replaced: result.matchedCount > 0 };
}
