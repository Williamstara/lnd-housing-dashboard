import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { auth0 } from "@/lib/auth0";
import { getNationsId } from "@/lib/nations";
import NavGrid from "@/app/_components/nav-grid";

const Home = auth0.withPageAuthRequired(
  async function Home() {
    const session = await auth0.getSession();
    const nationsId = getNationsId(session?.user);

    return (
      <Box sx={{ flex: 1, bgcolor: "background.default" }}>
        <Container maxWidth={false} sx={{ py: { xs: 3, md: 5 } }}>
          <Stack spacing={0.75} sx={{ alignItems: "flex-start", mb: 3 }}>
            <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1.2 }}>
              {nationsId ?? "LND"} · Bostadsförvaltning
            </Typography>
            <Typography variant="h3" component="h1">Välkommen tillbaka</Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 680 }}>
              Hej {session?.user.name}. Välj ett arbetsområde nedan eller använd menyn till vänster.
            </Typography>
          </Stack>
          <NavGrid />
        </Container>
      </Box>
    );
  },
  { returnTo: "/" }
);

export default Home;
