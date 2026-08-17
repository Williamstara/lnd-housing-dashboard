import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { auth } from "@clerk/nextjs/server";
import { getGmailToken } from "@/lib/gmail-tokens";
import ProfileGmailSection from "@/components/email/ProfileGmailSection";

export default async function ProfilPage() {
  const { userId } = await auth.protect();

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
