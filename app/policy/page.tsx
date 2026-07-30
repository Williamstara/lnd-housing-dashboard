import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { SITE_CONTACT } from "@/lib/site-contact";

export const metadata = {
  title: "Cookiepolicy & integritetspolicy — LND Housing Dashboard",
};

export default function PolicyPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={4}>
        <div>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
            Cookiepolicy &amp; integritetspolicy
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Senast uppdaterad: 29 juli 2026
          </Typography>
        </div>

        <section>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Personuppgiftsansvarig
          </Typography>
          <Typography variant="body1">
            {SITE_CONTACT.name} ansvarar för LND Housing Dashboard och för behandlingen av
            personuppgifter i tjänsten. Kontaktuppgifter finns längst ner på denna sida.
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Cookies vi använder
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Tjänsten använder endast kakor (cookies) och liknande lagring som är strikt nödvändiga
            för att webbplatsen ska fungera:
          </Typography>
          <Typography component="ul" variant="body1" sx={{ pl: 3, mb: 1 }}>
            <li>
              En inloggningssession (cookie) från vår inloggningsleverantör Auth0, som håller dig
              inloggad mellan sidladdningar.
            </li>
            <li>
              En lokal anteckning i din webbläsare (localStorage) om att du har läst denna
              cookieinformation, så att den inte visas på nytt varje gång du besöker sidan.
            </li>
          </Typography>
          <Typography variant="body1">
            Vi använder inga kakor för analys, marknadsföring, spårning eller reklam, och delar
            inga sådana uppgifter med tredje part. Eftersom kakorna ovan är nödvändiga för att
            tjänsten ska fungera kan de inte stängas av och kräver inte samtycke enligt
            lagen om elektronisk kommunikation — men vi vill ändå vara tydliga med att de finns.
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Personuppgifter vi behandlar
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Utöver inloggningsuppgifter (namn och e-postadress) hanterar tjänsten
            fastighets- och hyresgästuppgifter som förs in av behörig personal i respektive
            nation, till exempel lägenhetsnummer, namn, personnummer, kontaktuppgifter och
            kontonummer. Detta sker för att administrera bostäder och hyresförhållanden och
            grundar sig på avtal och berättigat intresse.
          </Typography>
          <Typography variant="body1">
            Uppgifterna sparas så länge de behövs för administrationen av bostäderna och tas bort
            eller anonymiseras när de inte längre behövs. Kontakta oss för specifika frågor om
            lagringstid för en viss uppgift.
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Dina rättigheter
          </Typography>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Du har rätt att begära tillgång till, rättelse av eller radering av dina
            personuppgifter, samt att invända mot eller begränsa vissa behandlingar. Kontakta oss
            via uppgifterna nedan för att utöva dina rättigheter.
          </Typography>
          <Typography variant="body1">
            Du har även rätt att lämna klagomål till Integritetsskyddsmyndigheten (IMY) om du
            anser att dina personuppgifter behandlas i strid med gällande dataskyddslagstiftning.
          </Typography>
        </section>

        <Divider />

        <section>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Kontakt
          </Typography>
          <Typography variant="body1">
            {SITE_CONTACT.name}
            <br />
            E-post: <a href={`mailto:${SITE_CONTACT.email}`}>{SITE_CONTACT.email}</a>
            <br />
            Telefon: <a href={`tel:${SITE_CONTACT.phoneHref}`}>{SITE_CONTACT.phone}</a>
          </Typography>
        </section>
      </Stack>
    </Container>
  );
}
