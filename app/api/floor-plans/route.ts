import { NextRequest } from "next/server";
import { createFloorPlan, getFloorPlans } from "@/lib/floor-plans";
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

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const plans = await getFloorPlans(auth.nationsId);
    return Response.json(plans.map((p) => ({ ...p, _id: p.id })));
  } catch {
    return Response.json({ error: "Failed to fetch floor plans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return Response.json({ error: "File is required" }, { status: 400 });
    const aptName = file.name.replace(/\.pdf$/i, "");
    const buffer = Buffer.from(await file.arrayBuffer());
    const plan = await createFloorPlan(auth.nationsId, aptName, buffer, file.type || "application/pdf");
    return Response.json({ ...plan, _id: plan.id }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to upload floor plan" }, { status: 500 });
  }
}
