import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type MailTemplate = {
  id: string;
  name: string;
  message: string;
  starred: boolean;
  attachmentName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const BUCKET = "mail-template-attachments";

const TEMPLATE_COLUMNS =
  "id, name, message, starred, attachment_storage_path, attachment_filename, attachment_content_type, created_at, updated_at" as const;

type MailTemplateRow = {
  id: string;
  name: string;
  message: string;
  starred: boolean | null;
  attachment_storage_path: string | null;
  attachment_filename: string | null;
  attachment_content_type: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: MailTemplateRow): MailTemplate {
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    starred: row.starred ?? false,
    attachmentName: row.attachment_filename ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getMailTemplates(nationsId: string): Promise<MailTemplate[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("mail_templates")
    .select(TEMPLATE_COLUMNS)
    .eq("nations_id", nationsId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as MailTemplateRow[]).map(mapRow);
}

// upsert: true — this also handles replacing an existing attachment, not
// just the first upload (the storage migration's UPDATE policy covers this).
export async function setTemplateAttachment(
  nationsId: string,
  id: string,
  filename: string,
  data: Buffer,
  contentType: string
): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("mail_templates")
    .select("id")
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  if (!existing) return false;

  const storagePath = `${nationsId}/${id}/${filename}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, data, { contentType, upsert: true });
  if (uploadError) throw uploadError;

  const { error } = await supabase
    .from("mail_templates")
    .update({
      attachment_storage_path: storagePath,
      attachment_filename: filename,
      attachment_content_type: contentType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
  return true;
}

export async function removeTemplateAttachment(nationsId: string, id: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("mail_templates")
    .select("attachment_storage_path")
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  if (!existing) return false;

  const { error } = await supabase
    .from("mail_templates")
    .update({
      attachment_storage_path: null,
      attachment_filename: null,
      attachment_content_type: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;

  if (existing.attachment_storage_path) {
    await supabase.storage.from(BUCKET).remove([existing.attachment_storage_path]);
  }
  return true;
}

export async function getTemplateAttachment(
  nationsId: string,
  id: string
): Promise<{ filename: string; data: Buffer; contentType: string } | null> {
  const supabase = createSupabaseServerClient();
  const { data: row, error: findError } = await supabase
    .from("mail_templates")
    .select("attachment_storage_path, attachment_filename, attachment_content_type")
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  if (!row?.attachment_storage_path) return null;

  const { data: blob, error: downloadError } = await supabase.storage
    .from(BUCKET)
    .download(row.attachment_storage_path);
  if (downloadError) throw downloadError;
  return {
    filename: row.attachment_filename ?? "",
    data: Buffer.from(await blob.arrayBuffer()),
    contentType: row.attachment_content_type ?? "application/octet-stream",
  };
}

export async function setStarredTemplate(nationsId: string, id: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error: unsetError } = await supabase
    .from("mail_templates")
    .update({ starred: false })
    .eq("nations_id", nationsId);
  if (unsetError) throw unsetError;

  const { error } = await supabase
    .from("mail_templates")
    .update({ starred: true })
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;
}

export async function createMailTemplate(
  nationsId: string,
  name: string,
  message: string
): Promise<MailTemplate> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("mail_templates")
    .insert({ nations_id: nationsId, name, message, starred: false })
    .select(TEMPLATE_COLUMNS)
    .single();
  if (error) throw error;
  return mapRow(data as MailTemplateRow);
}

export async function updateMailTemplate(
  nationsId: string,
  id: string,
  data: { name?: string; message?: string }
): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { data: rows, error } = await supabase
    .from("mail_templates")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("nations_id", nationsId)
    .select("id");
  if (error) throw error;
  return (rows as { id: string }[]).length > 0;
}

export async function deleteMailTemplate(nationsId: string, id: string): Promise<boolean> {
  const supabase = createSupabaseServerClient();
  const { data: existing, error: findError } = await supabase
    .from("mail_templates")
    .select("attachment_storage_path")
    .eq("id", id)
    .eq("nations_id", nationsId)
    .maybeSingle();
  if (findError) throw findError;
  if (!existing) return false;

  const { error } = await supabase
    .from("mail_templates")
    .delete()
    .eq("id", id)
    .eq("nations_id", nationsId);
  if (error) throw error;

  if (existing.attachment_storage_path) {
    await supabase.storage.from(BUCKET).remove([existing.attachment_storage_path]);
  }
  return true;
}
