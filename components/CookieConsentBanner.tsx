"use client";

import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";

const CONSENT_KEY = "cookie-consent-ack";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  function acknowledge() {
    localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.snackbar,
        bgcolor: "grey.900",
        color: "common.white",
        px: { xs: 2, sm: 4 },
        py: 2,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", maxWidth: 1200, mx: "auto" }}
      >
        <Typography variant="body2">
          Den här webbplatsen använder endast kakor (cookies) som är nödvändiga för att du ska
          kunna logga in och använda tjänsten. Vi använder inga kakor för analys, marknadsföring
          eller spårning. Läs mer i vår{" "}
          <Link href="/policy" style={{ color: "inherit" }}>
            cookiepolicy
          </Link>
          .
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          onClick={acknowledge}
          sx={{ flexShrink: 0, alignSelf: { xs: "flex-start", sm: "center" } }}
        >
          Jag förstår
        </Button>
      </Stack>
    </Box>
  );
}
