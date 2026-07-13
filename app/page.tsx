import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { navLinks } from "@/lib/nav-links";

// Wrapped in withPageAuthRequired so the landing page itself requires a
// session — visiting "/" while logged out redirects straight to Auth0
// login instead of showing a public page with a login button.
const Home = auth0.withPageAuthRequired(
  async function Home() {
    const session = await auth0.getSession();

    return (
      <Box sx={{ flex: 1, bgcolor: "background.default", py: { xs: 6, sm: 8 } }}>
        <Container maxWidth="lg">
          <Stack spacing={1} sx={{ alignItems: "flex-start", mb: 5 }}>
            <Typography variant="h3" component="h1">
              LND Housing Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 560 }}>
              Ett samlat verktyg för att hantera och överblicka hyresgäster i
              fastighetsbeståndet.
            </Typography>
            <Typography variant="body1" sx={{ pt: 1 }}>
              Välkommen tillbaka, {session?.user.name}.
            </Typography>
          </Stack>

          <Box
            sx={{
              display: "grid",
              gap: 2.5,
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
              },
            }}
          >
            {navLinks.map((link) => (
              <Card
                key={link.href}
                variant="outlined"
                sx={{
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.12),
                  transition: "border-color 150ms ease, transform 150ms ease",
                  "&:hover": {
                    borderColor: "primary.main",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <CardActionArea component={Link} href={link.href} sx={{ height: "100%" }}>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.3),
                          color: "primary.main",
                        }}
                      >
                        <link.icon />
                      </Box>
                      <Typography variant="h6">{link.label}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {link.description}
                      </Typography>
                    </Stack>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        </Container>
      </Box>
    );
  },
  { returnTo: "/" }
);

export default Home;
