import { NextRequest } from "next/server";
import { deleteFloorPlan, updateFloorPlan } from "@/lib/floor-plans";
import { getCurrentUserId, requireActiveNationsId } from "@/lib/active-nation";

async function requireAuth() {
  const userId = await getCurrentUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return { userId, nationsId: await requireActiveNationsId() };
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
    const { aptName } = (await request.json()) as { aptName?: string };
    if (!aptName) return Response.json({ error: "aptName is required" }, { status: 400 });
    const ok = await updateFloorPlan(auth.nationsId, id, aptName);
    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Failed to update floor plan" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const ok = await deleteFloorPlan(auth.nationsId, id);
    if (!ok) return Response.json({ error: "Not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Failed to delete floor plan" }, { status: 500 });
  }
}
