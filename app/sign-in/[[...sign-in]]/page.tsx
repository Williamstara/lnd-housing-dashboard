import Box from "@mui/material/Box";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center" }}>
      <SignIn />
    </Box>
  );
}
