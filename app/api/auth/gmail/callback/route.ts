import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { google } from "googleapis";
import { getCurrentUserId } from "@/lib/active-nation";
import { upsertGmailToken } from "@/lib/gmail-tokens";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";

  if (!userId)
    return NextResponse.redirect(`${baseUrl}/profil?gmail_error=unauthorized`);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error)
    return NextResponse.redirect(`${baseUrl}/profil?gmail_error=${encodeURIComponent(error)}`);

  const cookieStore = await cookies();
  const savedState = cookieStore.get("gmail_oauth_state")?.value;
  cookieStore.delete("gmail_oauth_state");

  if (!state || state !== savedState)
    return NextResponse.redirect(`${baseUrl}/profil?gmail_error=invalid_state`);
  if (!code)
    return NextResponse.redirect(`${baseUrl}/profil?gmail_error=no_code`);

  const redirectUri = `${baseUrl}/api/auth/gmail/callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GMAIL_CLIENT_ID!,
      client_secret: process.env.GMAIL_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
  };

  if (!tokens.access_token || !tokens.refresh_token)
    return NextResponse.redirect(`${baseUrl}/profil?gmail_error=token_exchange_failed`);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  if (!userInfo.email)
    return NextResponse.redirect(`${baseUrl}/profil?gmail_error=no_email`);

  let signature = "";
  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const list = await gmail.users.settings.sendAs.list({ userId: "me" });
    const primary = list.data.sendAs?.find((s) => s.isPrimary) ?? list.data.sendAs?.[0];
    signature = primary?.signature ?? "";
  } catch {
    // Non-fatal — signature can be synced later
  }

  await upsertGmailToken(
    userId,
    userInfo.email,
    userInfo.name ?? "",
    tokens.refresh_token,
    signature
  );

  return NextResponse.redirect(`${baseUrl}/profil?gmail_connected=true`);
}
