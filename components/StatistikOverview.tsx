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
  Bestandsoversikt,
  MissedIncomeByYear,
  SkickBucket,
  StatusBucket,
  TotalaIntakter,
  Uthyrningsgrad,
} from "@/lib/statistik";

type Props = {
  skick: SkickBucket[];
  totalaIntakter: TotalaIntakter;
  uthyrningsgrad: Uthyrningsgrad;
  missedIncomeByYear: MissedIncomeByYear;
  bestandsoversikt: Bestandsoversikt;
  lagenheterPerStatus: StatusBucket[];
};

const currency = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
const kr = (value: number) => `${currency.format(value)} kr`;

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, height: "100%" }}>
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
  bestandsoversikt,
  lagenheterPerStatus,
}: Props) {
  const theme = useTheme();
  const mode: ChartMode = theme.palette.mode === "dark" ? "dark" : "light";
  const categorical = CATEGORICAL[mode];
  const ordinal = ORDINAL_BLUE[mode];

  const skickData: BarDatum[] = skick.map((bucket, index) => ({
    label: bucket.label,
    value: bucket.count,
    color:
      bucket.label === "Okänt"
        ? theme.palette.action.disabledBackground
        : ordinal[Math.min(index, ordinal.length - 1)],
    tooltip: `${bucket.label}: ${bucket.count} objekt`,
  }));
  const intakterData: BarDatum[] = [
    { label: "Målbildshyra", value: totalaIntakter.malbildshyra, color: categorical[0] },
    { label: "Hyresrabatt", value: totalaIntakter.hyresrabatt, color: categorical[1] },
    { label: "Hyresreduktion", value: totalaIntakter.hyresreduktion, color: categorical[2] },
    { label: "Individuell årshyra", value: totalaIntakter.individuellArshyra, color: categorical[3] },
  ];
  const currentYearIncluded = missedIncomeByYear.byYear.some(
    (year) => year.year === missedIncomeByYear.currentYear
  );
  const years = currentYearIncluded
    ? missedIncomeByYear.byYear
    : [...missedIncomeByYear.byYear, { year: missedIncomeByYear.currentYear, total: 0 }].sort(
        (a, b) => a.year.localeCompare(b.year)
      );
  const yearData: BarDatum[] = years.map((year) => ({
    label: year.year,
    value: year.total,
    color: year.year === missedIncomeByYear.currentYear ? categorical[0] : ordinal[0],
    tooltip: `${year.year}: ${kr(year.total)}`,
  }));
  const boendeData: BarDatum[] = [
    { label: "Förstahand", value: bestandsoversikt.forstahand, color: categorical[0] },
    { label: "Inneboende", value: bestandsoversikt.inneboende, color: categorical[1] },
    { label: "Andrahand", value: bestandsoversikt.andrahandsgaster, color: categorical[2] },
  ];
  const fastighetData: BarDatum[] = bestandsoversikt.bostaderPerFastighet.map((item, index) => ({
    label: item.label,
    value: item.count,
    color: ordinal[Math.min(index, ordinal.length - 1)],
  }));
  const typData: BarDatum[] = bestandsoversikt.bostaderPerTyp.map((item, index) => ({
    label: item.label,
    value: item.count,
    color: categorical[index % categorical.length],
    tooltip: `${item.label}: ${item.count} bostäder`,
  }));
  const statusData: BarDatum[] = lagenheterPerStatus.map((bucket, index) => ({
    label: bucket.label,
    value: bucket.count,
    color: categorical[index % categorical.length],
    tooltip: `${bucket.label}: ${bucket.count} lägenheter`,
  }));

  return (
    <>
      <Stack spacing={0.5} sx={{ mb: 3 }}>
        <Typography variant="overline" color="primary" sx={{ fontWeight: 700, letterSpacing: 1.2 }}>
          Beståndsöversikt
        </Typography>
        <Typography variant="h3" component="h1">
          Statistik
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Aktuellt bestånd, boende och ekonomi samlat på en sida.
        </Typography>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <StatTile label="Bostäder totalt" value={String(bestandsoversikt.bostader)} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <StatTile label="Hyresgäster totalt" value={String(bestandsoversikt.hyresgasterTotalt)} />
            <Typography variant="caption" color="text.secondary">
              Förstahand + inneboende
            </Typography>
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <StatTile label="Inneboende" value={String(bestandsoversikt.inneboende)} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
            <StatTile label="Andrahandsgäster" value={String(bestandsoversikt.andrahandsgaster)} />
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Boendeformer">
            <BarChart data={boendeData} valueFormatter={(value) => `${value} personer`} />
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Bostäder per fastighet">
            {fastighetData.length > 0 ? (
              <BarChart data={fastighetData} valueFormatter={(value) => `${value} bostäder`} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Inga bostäder i databasen ännu.
              </Typography>
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Bostäder per typ">
            {typData.length > 0 ? (
              <BarChart data={typData} valueFormatter={(value) => `${value} st`} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Inga bostäder i databasen ännu.
              </Typography>
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Lägenheter per status">
            {statusData.length > 0 ? (
              <BarChart data={statusData} valueFormatter={(value) => `${value} st`} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Inga lediga lägenheter i pipelinen just nu.
              </Typography>
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
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
        <Grid size={{ xs: 12, lg: 6 }}>
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
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Generellt skick">
            {skickData.length > 0 ? (
              <BarChart data={skickData} valueFormatter={(value) => `${value} st`} />
            ) : (
              <Typography variant="body2" color="text.secondary">
                Inga hyresobjekt i databasen ännu.
              </Typography>
            )}
          </ChartCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <ChartCard title="Totala intäkter">
            <BarChart data={intakterData} valueFormatter={kr} />
          </ChartCard>
        </Grid>
      </Grid>
    </>
  );
}
