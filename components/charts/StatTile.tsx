"use client";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { CHROME, type ChartMode } from "./palette";

type Props = {
  label: string;
  value: string;
  color?: string;
};

export default function StatTile({ label, value, color }: Props) {
  const theme = useTheme();
  const mode: ChartMode = theme.palette.mode === "dark" ? "dark" : "light";
  const chrome = CHROME[mode];

  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: chrome.mutedInk, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, color: color ?? chrome.primaryInk, lineHeight: 1.1 }}>
        {value}
      </Typography>
    </Stack>
  );
}
