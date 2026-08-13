import { NextRequest } from "next/server";
import { getCachedSession } from "@/lib/auth0";
import { getUppsagningFile } from "@/lib/uppsagningar";
import { requireActiveNationsId } from "@/lib/active-nation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await getCachedSession();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const nationsId = await requireActiveNationsId(session.user);
    const { id } = await params;
    const file = await getUppsagningFile(nationsId, id);
    if (!file) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(new Blob([file.data as unknown as BlobPart], { type: file.contentType }), {
      headers: {
        "Content-Disposition": `inline; filename="${file.filename}"`,
        "Content-Type": file.contentType,
      },
    });
  } catch {
    return Response.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
