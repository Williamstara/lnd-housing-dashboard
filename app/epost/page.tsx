import { auth } from "@clerk/nextjs/server";
import { requireActiveNationsIdOrRedirect } from "@/lib/active-nation";
import { getFastighetNamn } from "@/lib/fastigheter";
import SendMailClient from "@/components/email/SendMailClient";

export default async function EpostPage() {
  await auth.protect();
  const nationsId = await requireActiveNationsIdOrRedirect();
  const fastigheter = await getFastighetNamn(nationsId);
  return <SendMailClient fastigheter={fastigheter} />;
}
