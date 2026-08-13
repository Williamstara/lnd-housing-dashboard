import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type GmailToken = {
  userId: string;
  email: string;
  name: string;
  refreshToken: string;
  signature: string;
};

type GmailTokenRow = {
  user_id: string;
  email: string;
  name: string;
  refresh_token: string;
  signature: string | null;
};

function mapRow(row: GmailTokenRow): GmailToken {
  return {
    userId: row.user_id,
    email: row.email,
    name: row.name,
    refreshToken: row.refresh_token,
    signature: row.signature ?? "",
  };
}

export async function getGmailToken(userId: string): Promise<GmailToken | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("gmail_tokens")
    .select("user_id, email, name, refresh_token, signature")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as GmailTokenRow) : null;
}

export async function upsertGmailToken(
  userId: string,
  email: string,
  name: string,
  refreshToken: string,
  signature: string
): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("gmail_tokens")
    .upsert(
      { user_id: userId, email, name, refresh_token: refreshToken, signature },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}

export async function deleteGmailToken(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("gmail_tokens").delete().eq("user_id", userId);
  if (error) throw error;
}
