import { redirect } from "next/navigation";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { auth0 } from "@/lib/auth0";
import { getGmailToken } from "@/lib/gmail-tokens";
import ProfileGmailSection from "@/components/email/ProfileGmailSection";

export default async function ProfilPage() {
  const session = await auth0.getSession();
  if (!session?.user) redirect("/auth/login");

  const userId = session.user.sub as string;
  const token = await getGmailToken(userId);

  const gmailConnected = !!token;
  const gmailEmail = token?.email ?? null;
  const gmailName = token?.name ?? null;
  const gmailSignature = token?.signature ?? null;

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 3 }}>Profil</Typography>
      <ProfileGmailSection
        gmailConnected={gmailConnected}
        gmailEmail={gmailEmail}
        gmailName={gmailName}
        gmailSignature={gmailSignature}
      />
    </Container>
  );
}
