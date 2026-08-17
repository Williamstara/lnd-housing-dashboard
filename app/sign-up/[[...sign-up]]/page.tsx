import Box from "@mui/material/Box";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <Box sx={{ display: "flex", minHeight: "100dvh", alignItems: "center", justifyContent: "center" }}>
      <SignUp />
    </Box>
  );
}
