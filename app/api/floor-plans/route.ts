import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import { createFloorPlan, getFloorPlans } from "@/lib/floor-plans";

async function requireAuth() {
  const session = await auth0.getSession();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return { userId: session.user.sub as string };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  try {
    const plans = await getFloorPlans();
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
    const plan = await createFloorPlan(aptName, buffer, file.type || "application/pdf");
    return Response.json({ ...plan, _id: plan.id }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to upload floor plan" }, { status: 500 });
  }
}
