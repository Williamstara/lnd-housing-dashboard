import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import { ThemeProvider } from "@mui/material/styles";
import { getActiveNationsId, getCurrentUserId } from "@/lib/active-nation";
import { getNationSettings } from "@/lib/nation-settings";
import theme from "@/lib/theme";
import NavBar from "@/components/NavBar";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const nationsId = await getActiveNationsId();
  return {
    title: `${nationsId ?? "LND"} Housing Dashboard`,
    description: "Dashboard för hyresgästhantering",
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [userId, nationsId] = await Promise.all([getCurrentUserId(), getActiveNationsId()]);
  const settings = nationsId ? await getNationSettings(nationsId) : null;

  return (
    <html lang="sv" className={montserrat.variable}>
      <body>
        <ClerkProvider>
          <AppRouterCacheProvider options={{ key: "mui" }}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <Box sx={{ display: "flex", minHeight: "100dvh", bgcolor: "background.default" }}>
                <Box
                  component="a"
                  href="#main-content"
                  sx={{
                    position: "fixed",
                    top: 8,
                    left: 8,
                    zIndex: 2000,
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    bgcolor: "background.paper",
                    color: "primary.main",
                    transform: "translateY(-150%)",
                    "&:focus": { transform: "translateY(0)" },
                  }}
                >
                  Hoppa till innehåll
                </Box>
                {userId ? <NavBar enabledFeatures={settings?.enabledFeatures} /> : null}
                <Box
                  component="main"
                  id="main-content"
                  tabIndex={-1}
                  sx={{ flex: 1, minWidth: 0, pt: { xs: userId ? 8 : 0, md: 0 }, bgcolor: "background.default" }}
                >
                  {children}
                </Box>
              </Box>
            </ThemeProvider>
          </AppRouterCacheProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
