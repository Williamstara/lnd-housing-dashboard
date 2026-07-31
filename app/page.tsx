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
      <Box sx={{ flex: 1, bgcolor: "background.default", py: { xs: 6, sm: 8 } }}>
        <Container maxWidth="lg">
          <Stack spacing={1} sx={{ alignItems: "flex-start", mb: 5 }}>
            <Typography variant="h3" component="h1">
              {nationsId ?? "LND"} Housing Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
              Ett samlat verktyg för att hantera och överblicka hyresgäster i
              fastighetsbeståndet.
            </Typography>
            <Typography variant="body1" sx={{ pt: 1 }}>
              Välkommen tillbaka, {session?.user.name}.
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
