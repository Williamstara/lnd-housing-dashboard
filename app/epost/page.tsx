import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import SendMailClient from "@/components/email/SendMailClient";

export default async function EpostPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login");
  return <SendMailClient />;
}
