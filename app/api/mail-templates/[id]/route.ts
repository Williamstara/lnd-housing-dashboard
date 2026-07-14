import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { deleteMailTemplate, setStarredTemplate, updateMailTemplate } from "@/lib/mail-templates";

async function requireAuth() {
  const session = await auth0.getSession();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return { userId: session.user.sub as string };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const data = (await request.json()) as { name?: string; message?: string };
    const ok = await updateMailTemplate(id, data);
    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function PATCH(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    await setStarredTemplate(id);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to star template" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const ok = await deleteMailTemplate(id);
    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
