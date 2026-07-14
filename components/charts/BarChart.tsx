"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { CHROME, type ChartMode } from "./palette";

export type BarDatum = {
  label: string;
  value: number;
  color: string;
  tooltip?: string;
};

type Props = {
  data: BarDatum[];
  valueFormatter?: (value: number) => string;
};

export default function BarChart({ data, valueFormatter = String }: Props) {
  const theme = useTheme();
  const mode: ChartMode = theme.palette.mode === "dark" ? "dark" : "light";
  const chrome = CHROME[mode];
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <Stack spacing={1.75}>
      {data.map((d) => (
        <Box key={d.label}>
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 0.5, gap: 1 }}>
            <Typography variant="body2" sx={{ color: chrome.secondaryInk }}>
              {d.label}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: chrome.primaryInk }}
            >
              {valueFormatter(d.value)}
            </Typography>
          </Stack>
          <Box
            sx={{
              position: "relative",
              height: 10,
              borderRadius: 999,
              bgcolor: chrome.track,
              overflow: "hidden",
            }}
          >
            <Box
              title={d.tooltip ?? `${d.label}: ${valueFormatter(d.value)}`}
              sx={{
                position: "absolute",
                inset: 0,
                width: `${Math.min(100, (d.value / max) * 100)}%`,
                bgcolor: d.color,
                borderRadius: 999,
                transition: "width 0.2s ease",
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
