"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { CHROME, type ChartMode } from "./palette";

export type DonutSegment = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
};

const SIZE = 160;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DonutChart({ segments, centerLabel, centerValue }: Props) {
  const theme = useTheme();
  const mode: ChartMode = theme.palette.mode === "dark" ? "dark" : "light";
  const chrome = CHROME[mode];
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let cumulative = 0;

  return (
    <Stack direction="row" spacing={3} sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <Box sx={{ position: "relative", width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={chrome.track}
            strokeWidth={STROKE}
          />
          {total > 0 &&
            segments
              .filter((s) => s.value > 0)
              .map((s) => {
                const dash = (s.value / total) * CIRCUMFERENCE;
                const gap = CIRCUMFERENCE - dash;
                const offset = -cumulative;
                cumulative += dash;
                return (
                  <circle
                    key={s.label}
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={RADIUS}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={STROKE}
                    strokeDasharray={`${dash} ${gap}`}
                    strokeDashoffset={offset}
                    strokeLinecap="butt"
                    transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                  >
                    <title>
                      {s.label}: {s.value}
                    </title>
                  </circle>
                );
              })}
        </svg>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 700, color: chrome.primaryInk, lineHeight: 1.1 }}>
            {centerValue}
          </Typography>
          <Typography variant="caption" sx={{ color: chrome.mutedInk, textAlign: "center", maxWidth: 90 }}>
            {centerLabel}
          </Typography>
        </Box>
      </Box>

      <Stack spacing={1}>
        {segments.map((s) => (
          <Stack key={s.label} direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: s.color, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: chrome.secondaryInk }}>
              {s.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: chrome.primaryInk }}>
              {s.value}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
