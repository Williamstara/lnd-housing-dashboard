"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export type SegmentDatum = { label: string; value: number; color: string };

type Props = {
  segments: SegmentDatum[];
  ariaLabel?: string;
  valueFormatter?: (value: number) => string;
};

// A single horizontal bar split into colored segments sized proportionally
// via flexGrow (no manual percentage math), plus a legend showing every
// segment's value — including zero-value ones, which the bar itself skips.
export default function SegmentedBar({ segments, ariaLabel, valueFormatter = String }: Props) {
  return (
    <Stack spacing={1.5}>
      <Box
        role="img"
        aria-label={ariaLabel ?? segments.map((s) => `${s.label}: ${valueFormatter(s.value)}`).join(", ")}
        sx={{ display: "flex", height: 28, borderRadius: 999, overflow: "hidden" }}
      >
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <Box
              key={s.label}
              title={`${s.label}: ${valueFormatter(s.value)}`}
              sx={{ flexGrow: s.value, bgcolor: s.color }}
            />
          ))}
      </Box>
      <Stack direction="row" sx={{ gap: 2.5, flexWrap: "wrap" }}>
        {segments.map((s) => (
          <Stack key={s.label} direction="row" sx={{ alignItems: "center", gap: 0.75 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: s.color, flexShrink: 0 }} />
            <Typography variant="body2" color="text.secondary">
              {s.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {valueFormatter(s.value)}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
