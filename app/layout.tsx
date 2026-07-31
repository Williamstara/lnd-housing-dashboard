import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
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
    <html lang="sv" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <Auth0Provider user={session?.user}>
              <NavBar />
              <main className="flex flex-1 flex-col">{children}</main>
            </Auth0Provider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
