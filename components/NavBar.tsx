"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { usePathname } from "next/navigation";
import HolidayVillageIcon from "@mui/icons-material/HolidayVillage";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { navLinks } from "@/lib/nav-links";

export default function NavBar() {
  const { user, isLoading } = useUser();
  const pathname = usePathname();

  return (
    <AppBar position="static" color="primary" enableColorOnDark>
      <Toolbar sx={{ gap: 2, flexWrap: "wrap", py: 1.25 }}>
        <Stack
          direction="row"
          component={Link}
          href="/"
          sx={{
            alignItems: "center",
            gap: 1,
            flexGrow: 1,
            color: "inherit",
            textDecoration: "none",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34,
              height: 34,
              borderRadius: 1.5,
              bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.9),
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            <HolidayVillageIcon fontSize="small" />
          </Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, letterSpacing: -0.2, whiteSpace: "nowrap" }}
          >
            LND Housing Dashboard
          </Typography>
        </Stack>

        {user && (
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Button
                  key={link.href}
                  component={Link}
                  href={link.href}
                  startIcon={<link.icon fontSize="small" />}
                  size="small"
                  sx={{
                    color: "inherit",
                    px: 1.5,
                    borderRadius: 1.5,
                    bgcolor: active
                      ? (theme) => alpha(theme.palette.secondary.main, 0.28)
                      : "transparent",
                    "&:hover": {
                      bgcolor: (theme) =>
                        alpha(theme.palette.secondary.main, active ? 0.34 : 0.16),
                    },
                  }}
                >
                  {link.label}
                </Button>
              );
            })}
          </Stack>
        )}

        {isLoading ? (
          <CircularProgress size={20} color="inherit" />
        ) : user ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              component={Link}
              href="/profil"
              sx={{ display: "flex", alignItems: "center", gap: 1, color: "inherit", textDecoration: "none", "&:hover": { opacity: 0.85 } }}
            >
              {user.picture && (
                <Avatar
                  src={user.picture}
                  alt={user.name ?? "User"}
                  sx={{
                    width: 32,
                    height: 32,
                    border: (theme) => `2px solid ${alpha(theme.palette.secondary.main, 0.7)}`,
                  }}
                />
              )}
              <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>
                {user.name}
              </Typography>
            </Box>
            <Button
              component="a"
              href="/auth/logout"
              color="inherit"
              variant="outlined"
              size="small"
              sx={{ borderColor: (theme) => alpha(theme.palette.secondary.main, 0.6) }}
            >
              Logga ut
            </Button>
          </Box>
        ) : (
          <Button
            component="a"
            href="/auth/login"
            color="inherit"
            variant="outlined"
            sx={{ borderColor: (theme) => alpha(theme.palette.secondary.main, 0.6) }}
          >
            Logga in
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}
