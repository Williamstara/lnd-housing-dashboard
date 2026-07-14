import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { createMailTemplate, getMailTemplates } from "@/lib/mail-templates";

async function requireAuth() {
  const session = await auth0.getSession();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return { userId: session.user.sub as string };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const templates = await getMailTemplates();
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
    const template = await createMailTemplate(name, message);
    return Response.json({ ...template, _id: template.id }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to create template" }, { status: 500 });
  }
}
