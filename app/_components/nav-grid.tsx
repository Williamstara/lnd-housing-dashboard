"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import Link from "next/link";
import { navLinks } from "@/lib/nav-links";

export default function NavGrid() {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 2.5,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: "repeat(3, 1fr)",
        },
      }}
    >
      {navLinks.map((link) => (
        <Card
          key={link.href}
          variant="outlined"
          sx={{
            borderColor: "rgba(var(--mui-palette-primary-mainChannel) / 0.12)",
            transition: "border-color 150ms ease, transform 150ms ease",
            "&:hover": {
              borderColor: "primary.main",
              transform: "translateY(-2px)",
            },
          }}
        >
          <CardActionArea component={Link} href={link.href} sx={{ height: "100%" }}>
            <CardContent>
              <Stack spacing={1.5}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.3),
                    color: "primary.main",
                  }}
                >
                  <link.icon />
                </Box>
                <Typography variant="h6">{link.label}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {link.description}
                </Typography>
              </Stack>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
