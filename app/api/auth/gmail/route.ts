import { getCurrentUserId } from "@/lib/active-nation";
import { deleteGmailToken, getGmailToken } from "@/lib/gmail-tokens";

async function requireAuth() {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return { userId };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const token = await getGmailToken(auth.userId);
  return Response.json({ connected: !!token, email: token?.email ?? null, name: token?.name ?? null });
}

export async function DELETE() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  await deleteGmailToken(auth.userId);
  return Response.json({ success: true });
}
