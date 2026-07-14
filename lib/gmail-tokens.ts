import "server-only";
import { getDb } from "@/lib/mongodb";

export type GmailToken = {
  userId: string;
  email: string;
  name: string;
  refreshToken: string;
  signature: string;
};

async function getCollection() {
  const db = await getDb();
  return db.collection<GmailToken>("gmail-tokens");
}

export async function getGmailToken(userId: string): Promise<GmailToken | null> {
  const col = await getCollection();
  return col.findOne({ userId }, { projection: { _id: 0 } });
}

export async function upsertGmailToken(
  userId: string,
  email: string,
  name: string,
  refreshToken: string,
  signature: string
): Promise<void> {
  const col = await getCollection();
  await col.updateOne(
    { userId },
    { $set: { email, name, refreshToken, signature } },
    { upsert: true }
  );
}

export async function deleteGmailToken(userId: string): Promise<void> {
  const col = await getCollection();
  await col.deleteOne({ userId });
}
