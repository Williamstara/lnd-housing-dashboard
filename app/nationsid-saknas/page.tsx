import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export default function NationsIdSaknasPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <Typography variant="h2" component="h1" sx={{ fontWeight: 700 }}>
          404
        </Typography>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
          Kontot saknar en nationsID
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ditt konto är inte kopplat till någon nation i systemet och kan
          därför inte komma åt den här sidan. Kontakta administratören för
          att få ett nationsID tilldelat.
        </Typography>
      </Stack>
    </Container>
  );
}
