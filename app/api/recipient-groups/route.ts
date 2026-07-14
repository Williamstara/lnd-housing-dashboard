import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";
import {
  getAllTenantRecipients,
  getInflyttningRecipients,
  getTenantRecipientsByFastighet,
  getUtflyttningRecipients,
} from "@/lib/recipient-groups";

async function requireAuth() {
  const session = await auth0.getSession();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return true;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const fastighet = searchParams.get("fastighet") ?? "";
  const datum = searchParams.get("datum") ?? "";

  try {
    let recipients;
    switch (type) {
      case "all":
        recipients = await getAllTenantRecipients();
        break;
      case "fastighet":
        if (!fastighet) return Response.json({ error: "fastighet required" }, { status: 400 });
        recipients = await getTenantRecipientsByFastighet(fastighet);
        break;
      case "inflyttning":
        if (!datum) return Response.json({ error: "datum required" }, { status: 400 });
        recipients = await getInflyttningRecipients(datum);
        break;
      case "utflyttning":
        if (!datum) return Response.json({ error: "datum required" }, { status: 400 });
        recipients = await getUtflyttningRecipients(datum);
        break;
      default:
        return Response.json({ error: "Invalid type" }, { status: 400 });
    }
    return Response.json({ recipients });
  } catch {
    return Response.json({ error: "Failed to fetch recipients" }, { status: 500 });
  }
}
