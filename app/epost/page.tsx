import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { getFastighetNamn } from "@/lib/fastigheter";
import { requireNationsIdOrRedirect } from "@/lib/nations";
import SendMailClient from "@/components/email/SendMailClient";

export default async function EpostPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login");
  const nationsId = requireNationsIdOrRedirect(session.user);
  const fastigheter = await getFastighetNamn(nationsId);
  return <SendMailClient fastigheter={fastigheter} />;
}
