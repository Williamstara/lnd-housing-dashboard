import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { getFloorPlanFile } from "@/lib/floor-plans";
import { requireNationsId } from "@/lib/nations";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const session = await auth0.getSession();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const nationsId = requireNationsId(session.user);
    const { id } = await params;
    const file = await getFloorPlanFile(nationsId, id);
    if (!file) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(new Blob([file.data as unknown as BlobPart], { type: file.contentType }), {
      headers: {
        "Content-Disposition": `inline; filename="${file.aptName}.pdf"`,
        "Content-Type": file.contentType,
      },
    });
  } catch {
    return Response.json({ error: "Failed to fetch file" }, { status: 500 });
  }
}
