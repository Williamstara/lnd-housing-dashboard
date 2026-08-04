import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import { ThemeProvider } from "@mui/material/styles";
import { Auth0Provider } from "@auth0/nextjs-auth0";
import { auth0 } from "@/lib/auth0";
import { getNationsId } from "@/lib/nations";
import theme from "@/lib/theme";
import NavBar from "@/components/NavBar";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth0.getSession();
  const nationsId = getNationsId(session?.user);
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
  const session = await auth0.getSession();

  return (
    <html lang="sv" className={montserrat.variable}>
      <body>
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Auth0Provider user={session?.user}>
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
                <NavBar />
                <Box
                  component="main"
                  id="main-content"
                  tabIndex={-1}
                  sx={{ flex: 1, minWidth: 0, pt: { xs: 8, md: 0 }, bgcolor: "background.default" }}
                >
                  {children}
                </Box>
              </Box>
            </Auth0Provider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
