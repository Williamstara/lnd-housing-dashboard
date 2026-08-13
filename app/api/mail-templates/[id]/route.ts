import { NextRequest } from "next/server";
import { getCachedSession } from "@/lib/auth0";
import { deleteMailTemplate, setStarredTemplate, updateMailTemplate } from "@/lib/mail-templates";
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

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const data = (await request.json()) as { name?: string; message?: string };
    const ok = await updateMailTemplate(auth.nationsId, id, data);
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
    await setStarredTemplate(auth.nationsId, id);
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
    const ok = await deleteMailTemplate(auth.nationsId, id);
    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
