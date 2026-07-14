"use client";

import type { ReactNode } from "react";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import BarChart, { type BarDatum } from "@/components/charts/BarChart";
import DonutChart from "@/components/charts/DonutChart";
import StatTile from "@/components/charts/StatTile";
import { CATEGORICAL, ORDINAL_BLUE, STATUS, type ChartMode } from "@/components/charts/palette";
import type {
  MissedIncomeByYear,
  SkickBucket,
  TotalaIntakter,
  Uthyrningsgrad,
} from "@/lib/statistik";

type Props = {
  skick: SkickBucket[];
  totalaIntakter: TotalaIntakter;
  uthyrningsgrad: Uthyrningsgrad;
  missedIncomeByYear: MissedIncomeByYear;
};

const currency = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
const kr = (v: number) => `${currency.format(v)} kr`;

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, height: "100%" }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

export default function StatistikOverview({
  skick,
  totalaIntakter,
  uthyrningsgrad,
  missedIncomeByYear,
}: Props) {
  const theme = useTheme();
  const mode: ChartMode = theme.palette.mode === "dark" ? "dark" : "light";
  const categorical = CATEGORICAL[mode];
  const ordinal = ORDINAL_BLUE[mode];

  const skickData: BarDatum[] = skick.map((bucket, i) => ({
    label: bucket.label,
    value: bucket.count,
    color: bucket.label === "Okänt" ? theme.palette.action.disabledBackground : ordinal[Math.min(i, ordinal.length - 1)],
    tooltip: `${bucket.label}: ${bucket.count} objekt`,
  }));

  const intakterData: BarDatum[] = [
    { label: "Målbildshyra", value: totalaIntakter.malbildshyra, color: categorical[0] },
    { label: "Hyresrabatt", value: totalaIntakter.hyresrabatt, color: categorical[1] },
    { label: "Hyresreduktion", value: totalaIntakter.hyresreduktion, color: categorical[2] },
    { label: "Individuell årshyra", value: totalaIntakter.individuellArshyra, color: categorical[3] },
  ];

  const currentYearIncluded = missedIncomeByYear.byYear.some(
    (y) => y.year === missedIncomeByYear.currentYear
  );
  const years = currentYearIncluded
    ? missedIncomeByYear.byYear
    : [...missedIncomeByYear.byYear, { year: missedIncomeByYear.currentYear, total: 0 }].sort((a, b) =>
        a.year.localeCompare(b.year)
      );
  const yearData: BarDatum[] = years.map((y) => ({
    label: y.year,
    value: y.total,
    color: y.year === missedIncomeByYear.currentYear ? categorical[0] : ordinal[0],
    tooltip: `${y.year}: ${kr(y.total)}`,
  }));

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <ChartCard title="Uthyrningsgrad">
          <DonutChart
            centerLabel="uthyrningsgrad"
            centerValue={`${uthyrningsgrad.procent}%`}
            segments={[
              { label: "Uthyrda", value: uthyrningsgrad.uthyrda, color: STATUS.good },
              { label: "Ledigt, ej missat", value: uthyrningsgrad.ledigtEjMissat, color: STATUS.warning },
              { label: "Missad hyra", value: uthyrningsgrad.missadHyra, color: STATUS.critical },
            ]}
          />
          <Typography variant="caption" sx={{ display: "block", mt: 2, color: "text.secondary" }}>
            {uthyrningsgrad.total} lägenheter totalt i databasen.
          </Typography>
        </ChartCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <ChartCard title="Missade hyresintäkter">
          <Stack spacing={3}>
            <StatTile
              label={`Missad intäkt ${missedIncomeByYear.currentYear}`}
              value={kr(missedIncomeByYear.currentYearTotal)}
              color={STATUS.critical}
            />
            <BarChart data={yearData} valueFormatter={kr} />
          </Stack>
        </ChartCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <ChartCard title="Generellt skick">
          {skickData.length > 0 ? (
            <BarChart data={skickData} valueFormatter={(v) => `${v} st`} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Inga hyresobjekt i databasen ännu.
            </Typography>
          )}
        </ChartCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <ChartCard title="Totala intäkter">
          <BarChart data={intakterData} valueFormatter={kr} />
        </ChartCard>
      </Grid>
    </Grid>
  );
}
