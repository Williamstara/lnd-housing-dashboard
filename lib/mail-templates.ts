import "server-only";
import { Binary, ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type MailTemplate = {
  id: string;
  name: string;
  message: string;
  starred: boolean;
  attachmentName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type MailTemplateDoc = {
  name: string;
  message: string;
  starred?: boolean;
  attachment?: {
    filename: string;
    data: Binary;
    contentType: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

async function getCollection() {
  const db = await getDb();
  return db.collection<MailTemplateDoc>("mail-templates");
}

export async function getMailTemplates(): Promise<MailTemplate[]> {
  const col = await getCollection();
  const docs = await col.find({}, { projection: { "attachment.data": 0 } }).sort({ name: 1 }).toArray();
  return docs.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name,
    message: doc.message,
    starred: doc.starred ?? false,
    attachmentName: doc.attachment?.filename ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  }));
}

export async function setTemplateAttachment(
  id: string,
  filename: string,
  data: Buffer,
  contentType: string
): Promise<boolean> {
  const col = await getCollection();
  const result = await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { attachment: { filename, data: new Binary(data), contentType }, updatedAt: new Date() } }
  );
  return result.matchedCount > 0;
}

export async function removeTemplateAttachment(id: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.updateOne(
    { _id: new ObjectId(id) },
    { $unset: { attachment: "" }, $set: { updatedAt: new Date() } }
  );
  return result.matchedCount > 0;
}

export async function getTemplateAttachment(
  id: string
): Promise<{ filename: string; data: Buffer; contentType: string } | null> {
  const col = await getCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc?.attachment) return null;
  return {
    filename: doc.attachment.filename,
    data: Buffer.from(doc.attachment.data.buffer as ArrayBuffer),
    contentType: doc.attachment.contentType,
  };
}

export async function setStarredTemplate(id: string): Promise<void> {
  const col = await getCollection();
  await col.updateMany({}, { $set: { starred: false } });
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { starred: true } });
}

export async function createMailTemplate(name: string, message: string): Promise<MailTemplate> {
  const col = await getCollection();
  const now = new Date();
  const result = await col.insertOne({ name, message, starred: false, createdAt: now, updatedAt: now });
  return { id: result.insertedId.toString(), name, message, starred: false, createdAt: now, updatedAt: now };
}

export async function updateMailTemplate(
  id: string,
  data: { name?: string; message?: string }
): Promise<boolean> {
  const col = await getCollection();
  const result = await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...data, updatedAt: new Date() } }
  );
  return result.matchedCount > 0;
}

export async function deleteMailTemplate(id: string): Promise<boolean> {
  const col = await getCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}
