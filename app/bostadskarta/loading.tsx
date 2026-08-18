import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
export default function Loading() { return <Container maxWidth="xl" sx={{ py: 4 }}><Stack spacing={2}><Skeleton width={260} height={56} /><Skeleton variant="rounded" height={72} /><Skeleton variant="rounded" height={460} /></Stack></Container>; }

