import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { SITE_CONTACT } from "@/lib/site-contact";

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{ borderTop: 1, borderColor: "divider", py: 2, px: { xs: 2, sm: 4 }, mt: "auto" }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, maxWidth: 1200, mx: "auto" }}
      >
        <Typography variant="caption" color="text.secondary">
          © {new Date().getFullYear()} LND Housing Dashboard
        </Typography>
        <Stack direction="row" spacing={2}>
          <Typography variant="caption">
            <Link href="/policy">Cookiepolicy &amp; integritetspolicy</Link>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ansvarig: {SITE_CONTACT.name} ·{" "}
            <a href={`mailto:${SITE_CONTACT.email}`}>{SITE_CONTACT.email}</a>
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}
