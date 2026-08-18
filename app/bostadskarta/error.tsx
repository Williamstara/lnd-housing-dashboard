"use client";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
export default function ErrorPage({ reset }: { reset: () => void }) { return <Container maxWidth="md" sx={{ py: 6 }}><Alert severity="error" action={<Button color="inherit" onClick={reset}>Försök igen</Button>}>Bostadskartan kunde inte läsas in.</Alert></Container>; }
