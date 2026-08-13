import { getCachedSession } from "@/lib/auth0";
import { deleteGmailToken, getGmailToken } from "@/lib/gmail-tokens";

async function requireAuth() {
  const session = await getCachedSession();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return { userId: session.user.sub as string };
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
