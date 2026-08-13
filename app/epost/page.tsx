import { getCachedSession } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { getFastighetNamn } from "@/lib/fastigheter";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import SendMailClient from "@/components/email/SendMailClient";

export default async function EpostPage() {
  const session = await getCachedSession();
  if (!session?.user) redirect("/auth/login");
  const nationsId = await requireActiveNationsIdOrRedirect(session.user);
  const fastigheter = await getFastighetNamn(nationsId);
  return <SendMailClient fastigheter={fastigheter} />;
}
