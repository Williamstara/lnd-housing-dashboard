import { NextRequest } from "next/server";
import { getCachedSession } from "@/lib/auth0";
import { createMailTemplate, getMailTemplates } from "@/lib/mail-templates";
import { requireActiveNationsId } from "@/lib/active-nation";

async function requireAuth() {
  const session = await getCachedSession();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return { userId: session.user.sub as string, nationsId: await requireActiveNationsId(session.user) };
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unauthorized" }, { status: 403 });
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const templates = await getMailTemplates(auth.nationsId);
    return Response.json(templates.map((t) => ({ ...t, _id: t.id })));
  } catch {
    return Response.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const { name, message } = (await request.json()) as { name?: string; message?: string };
    if (!name || !message)
      return Response.json({ error: "Name and message are required" }, { status: 400 });
    const template = await createMailTemplate(auth.nationsId, name, message);
    return Response.json({ ...template, _id: template.id }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to create template" }, { status: 500 });
  }
}
