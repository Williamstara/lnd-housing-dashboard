import { NextRequest } from "next/server";
import { getCachedSession } from "@/lib/auth0";
import { removeTemplateAttachment, setTemplateAttachment } from "@/lib/mail-templates";
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

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf)
    return Response.json({ error: "Only PDF files are supported" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ok = await setTemplateAttachment(auth.nationsId, id, file.name, buffer, "application/pdf");

  if (!ok) return Response.json({ error: "Template not found" }, { status: 404 });
  return Response.json({ success: true, filename: file.name });
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const { id } = await params;
  const ok = await removeTemplateAttachment(auth.nationsId, id);
  if (!ok) return Response.json({ error: "Template not found" }, { status: 404 });
  return Response.json({ success: true });
}
