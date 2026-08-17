import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getActiveNationsId, getCurrentUserDisplayName, getCurrentUserId } from "@/lib/active-nation";
import { getNationSettings } from "@/lib/nation-settings";
import NavGrid from "@/app/_components/nav-grid";
import LandingPage from "@/app/_components/landing-page";

export default async function Home() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return <LandingPage />;
  }

  const nationsId = await getActiveNationsId();
  const [settings, userName] = await Promise.all([
    nationsId ? getNationSettings(nationsId) : null,
    getCurrentUserDisplayName(),
  ]);

  return (
    <Box sx={{ flex: 1, bgcolor: "background.default" }}>
      <Container maxWidth={false} sx={{ py: { xs: 3, md: 5 } }}>
        <Stack spacing={0.75} sx={{ alignItems: "flex-start", mb: 3 }}>
          <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1.2 }}>
            {nationsId ?? "LND"} · Bostadsförvaltning
          </Typography>
          <Typography variant="h3" component="h1">Välkommen tillbaka</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680 }}>
            Hej {userName}. Välj ett arbetsområde nedan eller använd menyn till vänster.
          </Typography>
        </Stack>
        <NavGrid enabledFeatures={settings?.enabledFeatures} />
      </Container>
    </Box>
  );
}
