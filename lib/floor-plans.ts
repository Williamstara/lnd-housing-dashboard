import "server-only";
import { Binary, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type FloorPlan = {
  id: string;
  aptName: string;
  contentType: string;
  createdAt: Date;
  updatedAt: Date;
};

type FloorPlanDoc = {
  nationsID: string;
  aptName: string;
  floorplanning: {
    data: Binary;
    contentType: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

async function getCollection() {
  const db = await getDb();
  return db.collection<FloorPlanDoc>("floor-plans");
}

export async function getFloorPlans(nationsId: string): Promise<FloorPlan[]> {
  const col = await getCollection();
  const docs = await col
    .find({ nationsID: nationsId }, { projection: { "floorplanning.data": 0 } })
    .sort({ aptName: 1 })
    .toArray();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    aptName: doc.aptName,
    contentType: doc.floorplanning?.contentType ?? "application/pdf",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));
}

export async function createFloorPlan(
  nationsId: string,
  aptName: string,
  data: Buffer,
  contentType: string
): Promise<FloorPlan> {
  const col = await getCollection();
  const now = new Date();
  const result = await col.insertOne({
    nationsID: nationsId,
    aptName,
    floorplanning: { data: new Binary(data), contentType },
    createdAt: now,
    updatedAt: now,
  } as FloorPlanDoc);
  return { id: result.insertedId.toString(), aptName, contentType, createdAt: now, updatedAt: now };
}

export async function updateFloorPlan(nationsId: string, id: string, aptName: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.updateOne(
    { _id: new ObjectId(id), nationsID: nationsId },
    { $set: { aptName, updatedAt: new Date() } }
  );
  return result.matchedCount > 0;
}

export async function deleteFloorPlan(nationsId: string, id: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id), nationsID: nationsId });
  return result.deletedCount > 0;
}

export async function getFloorPlanFile(
  nationsId: string,
  id: string
): Promise<{ data: Buffer; contentType: string; aptName: string } | null> {
  const col = await getCollection();
  const doc = await col.findOne({ _id: new ObjectId(id), nationsID: nationsId });
  if (!doc) return null;
  return {
    data: Buffer.from(doc.floorplanning.data.buffer as unknown as ArrayBuffer),
    contentType: doc.floorplanning.contentType,
    aptName: doc.aptName,
  };
}

export async function getFloorPlanByAptName(
  nationsId: string,
  aptName: string
): Promise<{ data: Buffer; contentType: string } | null> {
  const col = await getCollection();
  const doc = await col.findOne({
    nationsID: nationsId,
    aptName: { $regex: new RegExp(`^${aptName}$`, "i") },
  });
  if (!doc) return null;
  return {
    data: Buffer.from(doc.floorplanning.data.buffer as unknown as ArrayBuffer),
    contentType: doc.floorplanning.contentType,
  };
}
