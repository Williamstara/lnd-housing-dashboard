"use server";

import { revalidatePath } from "next/cache";
import { getCachedSession } from "@/lib/auth0";
import { setActiveNation } from "@/lib/active-nation";

// Cross-cutting (not scoped to one feature route, unlike every other
// actions.ts in app/*/) — the nation switcher lives in NavBar, which
// renders on every page.
export async function setActiveNationAction(nationsId: string): Promise<void> {
  const session = await getCachedSession();
  if (!session?.user) throw new Error("Unauthorized");
  await setActiveNation(session.user, nationsId);
  // Broad on purpose: switching nations changes what every page's data
  // fetch should return, unlike every other revalidatePath in this app
  // which targets the specific routes one action's data affects.
  revalidatePath("/", "layout");
}
