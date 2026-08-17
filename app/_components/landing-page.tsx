"use client";

import HolidayVillageIcon from "@mui/icons-material/HolidayVillage";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { NAV_GROUPS, navLinks } from "@/lib/nav-links";

// One representative link per nav group, just to give a signed-out visitor
// a concrete sense of what the dashboard does — not the full, role-filtered
// list NavGrid shows once signed in.
const highlights = NAV_GROUPS.map((group) => navLinks.find((link) => link.group === group.key && !link.adminOnly)).filter(
  (link): link is NonNullable<typeof link> => Boolean(link)
);

export default function LandingPage() {
  return (
    <Box>
      <Box sx={{ bgcolor: "primary.dark", color: "primary.contrastText" }}>
        <Container maxWidth={false} sx={{ py: { xs: 6, md: 10 } }}>
          <Stack spacing={3} sx={{ alignItems: "flex-start", maxWidth: 680 }}>
            <Box
              sx={{
                display: "grid",
                placeItems: "center",
                width: 52,
                height: 52,
                borderRadius: 2.5,
                bgcolor: "secondary.main",
                color: "primary.dark",
              }}
            >
              <HolidayVillageIcon fontSize="medium" />
            </Box>
            <Typography variant="overline" sx={{ fontWeight: 700, letterSpacing: 1.2, color: alpha("#fff", 0.7) }}>
              LND Housing Dashboard
            </Typography>
            <Typography variant="h3" component="h1">
              Ett samlat verktyg för din nations bostadsförvaltning
            </Typography>
            <Typography variant="body1" sx={{ color: alpha("#fff", 0.82), lineHeight: 1.6 }}>
              Hantera lediga lägenheter, hyresgäster, besiktningar, uppsägningar och kontrakt på
              samma ställe — istället för att sprida ut det i kalkylark och mejltrådar.
            </Typography>
            <Button
              component={Link}
              href="/sign-in"
              variant="contained"
              size="large"
              sx={{
                bgcolor: "secondary.main",
                color: "primary.dark",
                "&:hover": { bgcolor: "secondary.light" },
              }}
            >
              Logga in
            </Button>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth={false} sx={{ py: { xs: 5, md: 7 } }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 700 }}>
          Vad du får tillgång till
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2.5 }}>
          {highlights.map((link) => (
            <Stack
              key={link.href}
              spacing={1.25}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  color: "primary.main",
                }}
              >
                <link.icon fontSize="small" />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {link.label}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                {link.description}
              </Typography>
            </Stack>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
