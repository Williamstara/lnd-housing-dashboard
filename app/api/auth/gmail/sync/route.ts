import { google } from "googleapis";
import { getCurrentUserId } from "@/lib/active-nation";
import { getGmailToken, upsertGmailToken } from "@/lib/gmail-tokens";

async function requireAuth() {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return { userId };
}

export async function POST() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const token = await getGmailToken(auth.userId);
  if (!token) return Response.json({ error: "Gmail är inte anslutet" }, { status: 400 });

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: token.refreshToken });

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  let signature = "";
  try {
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    const list = await gmail.users.settings.sendAs.list({ userId: "me" });
    const primary = list.data.sendAs?.find((s) => s.isPrimary) ?? list.data.sendAs?.[0];
    signature = primary?.signature ?? "";
  } catch {
    return Response.json(
      { error: "Kunde inte hämta signatur. Försök att koppla från och ansluta Gmail igen." },
      { status: 500 }
    );
  }

  const name = userInfo.name ?? "";
  await upsertGmailToken(auth.userId, token.email, name, token.refreshToken, signature);
  return Response.json({ name, signature });
}
