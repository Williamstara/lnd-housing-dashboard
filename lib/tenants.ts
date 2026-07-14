import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type Tenant = {
  id: string;
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  personnummer: string;
  mejladress: string;
  telefonnummer: string;
};

export type TenantInput = {
  lagenhetsnummer: string;
  fastighet: string;
  namn: string;
  personnummer: string;
  mejladress: string;
  telefonnummer: string;
};

type TenantDocument = TenantInput & { nationsID: string };

async function getTenantsCollection() {
  const db = await getDb();
  return db.collection<TenantDocument>("tenants");
}

export async function getTenants(nationsId: string): Promise<Tenant[]> {
  const collection = await getTenantsCollection();
  const docs = await collection
    .find({ nationsID: nationsId })
    .sort({ fastighet: 1, lagenhetsnummer: 1 })
    .toArray();

  return docs.map((doc) => ({
    id: doc._id.toString(),
    lagenhetsnummer: doc.lagenhetsnummer,
    fastighet: doc.fastighet,
    namn: doc.namn,
    personnummer: doc.personnummer ?? "",
    mejladress: doc.mejladress,
    telefonnummer: doc.telefonnummer,
  }));
}

export async function createTenant(nationsId: string, input: TenantInput): Promise<string> {
  const collection = await getTenantsCollection();
  const result = await collection.insertOne({ ...input, nationsID: nationsId });
  return result.insertedId.toString();
}

export async function updateTenant(
  nationsId: string,
  id: string,
  input: TenantInput
): Promise<void> {
  const collection = await getTenantsCollection();
  await collection.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: input }
  );
}

export async function deleteTenant(nationsId: string, id: string): Promise<void> {
  const collection = await getTenantsCollection();
  await collection.deleteOne({ _id: new ObjectId(id), nationsID: nationsId });
}

// Replaces whoever is currently listed for this apartment number, or
// inserts a new row if nobody is. Used when pushing a signed contract's
// tenant over from the archive.
export async function upsertTenantByLagenhetsnummer(
  nationsId: string,
  input: TenantInput
): Promise<{ replaced: boolean }> {
  const collection = await getTenantsCollection();
  const result = await collection.updateOne(
    { nationsID: nationsId, lagenhetsnummer: input.lagenhetsnummer },
    { $set: { ...input, nationsID: nationsId } },
    { upsert: true }
  );
  return { replaced: result.matchedCount > 0 };
}

export type BulkUpsertResult = { inserted: number; updated: number };

export async function bulkUpsertTenants(
  nationsId: string,
  inputs: TenantInput[]
): Promise<BulkUpsertResult> {
  const collection = await getTenantsCollection();
  let inserted = 0;
  let updated = 0;
  for (const input of inputs) {
    const result = await collection.updateOne(
      { nationsID: nationsId, lagenhetsnummer: input.lagenhetsnummer },
      { $set: { ...input, nationsID: nationsId } },
      { upsert: true }
    );
    if (result.upsertedCount > 0) inserted++;
    else updated++;
  }
  return { inserted, updated };
}
