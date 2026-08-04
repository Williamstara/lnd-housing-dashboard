import type { Apartment, ApartmentStatus } from "@/lib/apartments";
import type { MissedRentRow } from "@/lib/missed-rent";
import type { RentalObject } from "@/lib/rentalobjects";
import type { Tenant } from "@/lib/tenants";
import type { Andrahandsgast } from "@/lib/andrahandsgaster";

// Pure aggregation/shaping helpers for the Statistik page's overview charts.
// Deliberately take already-fetched arrays rather than querying themselves —
// the page fetches rentalobjects/apartments/missed-rent once (it already
// needs them for the Missade hyror table) and reuses them here, so no extra
// database round trips are added just to draw a chart.

export type SkickBucket = { label: string; count: number };

const SKICK_LABELS: Record<number, string> = {
  1: "OK",
  2: "Litet renoveringsbehov",
  3: "Medel renoveringsbehov",
  4: "Stort renoveringsbehov",
};

// Ordered worst-to-best isn't right either — keep the natural 1→4 order so
// the chart's ordinal ramp reads as "condition worsening left to right".
export function getGenerelltSkick(rentalObjects: RentalObject[]): SkickBucket[] {
  const counts = new Map<number, number>();
  let unknown = 0;
  for (const o of rentalObjects) {
    if (o.renoveringsbehov && SKICK_LABELS[o.renoveringsbehov]) {
      counts.set(o.renoveringsbehov, (counts.get(o.renoveringsbehov) ?? 0) + 1);
    } else {
      unknown++;
    }
  }
  const buckets: SkickBucket[] = [1, 2, 3, 4]
    .filter((tier) => counts.has(tier))
    .map((tier) => ({ label: SKICK_LABELS[tier], count: counts.get(tier)! }));
  if (unknown > 0) buckets.push({ label: "Okänt", count: unknown });
  return buckets;
}

export type TotalaIntakter = {
  malbildshyra: number;
  hyresrabatt: number;
  hyresreduktion: number;
  individuellArshyra: number;
};

export function getTotalaIntakter(rentalObjects: RentalObject[]): TotalaIntakter {
  return rentalObjects.reduce<TotalaIntakter>(
    (acc, o) => ({
      malbildshyra: acc.malbildshyra + (o.malbildshyra ?? 0),
      hyresrabatt: acc.hyresrabatt + Math.abs(o.hyresrabatt ?? 0),
      hyresreduktion: acc.hyresreduktion + Math.abs(o.hyresred ?? 0),
      individuellArshyra: acc.individuellArshyra + (o.individuellArshyra ?? 0),
    }),
    { malbildshyra: 0, hyresrabatt: 0, hyresreduktion: 0, individuellArshyra: 0 }
  );
}

export type Uthyrningsgrad = {
  total: number;
  uthyrda: number;
  ledigtEjMissat: number;
  missadHyra: number;
  procent: number;
};

// "Vacant" = apartments still open in the lediga lägenheter pipeline
// (non-archived, i.e. every status except arkiverad) for each physical unit
// in the databas. Of those, the ones with an unresolved missed-rent row
// (ledig fr.o.m. passed, faktiskt inflytt still blank) count as "Missad
// hyra"; the rest are "Ledigt, ej missat" (still within their notice
// period / awaiting a signed tenant, but not yet overdue).
export function getUthyrningsgrad(
  rentalObjects: RentalObject[],
  vacantApartments: Apartment[],
  missedRent: MissedRentRow[]
): Uthyrningsgrad {
  const total = rentalObjects.length;
  const vacantIds = new Set(vacantApartments.map((a) => a.id));
  const missadHyra = missedRent.filter(
    (r) => !r.faktisktInflyttDatum && r.apartmentId != null && vacantIds.has(r.apartmentId)
  ).length;
  const vacantCount = vacantApartments.length;
  const ledigtEjMissat = Math.max(0, vacantCount - missadHyra);
  const uthyrda = Math.max(0, total - vacantCount);
  const procent = total > 0 ? Math.round((uthyrda / total) * 100) : 0;

  return { total, uthyrda, ledigtEjMissat, missadHyra, procent };
}

export type MissedIncomeYear = { year: string; total: number };
export type MissedIncomeByYear = {
  currentYear: string;
  currentYearTotal: number;
  byYear: MissedIncomeYear[];
};

// Grouped by the year the vacancy started (ledig fr.o.m.) — a vacancy that
// straddles a year boundary is attributed to the year it began in. Uses
// totalMissat (missed rent + övriga missade kostnader), not just the
// vacancy-gap calculation, since a case can lose more than the missed month.
export function getMissedIncomeByYear(missedRent: MissedRentRow[]): MissedIncomeByYear {
  const totals = new Map<string, number>();
  for (const row of missedRent) {
    const year = row.ledigFrom.slice(0, 4);
    totals.set(year, (totals.get(year) ?? 0) + row.totalMissat);
  }
  const byYear = Array.from(totals.entries())
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => a.year.localeCompare(b.year));

  const currentYear = String(new Date().getFullYear());
  return {
    currentYear,
    currentYearTotal: totals.get(currentYear) ?? 0,
    byYear,
  };
}

export type AnsvarigBucket = { label: string; total: number };

// Total missed amount (totalMissat, kr) attributed to each person's cases —
// not a case count. Ansvarig is free text (no fixed enum), so unassigned
// rows get their own bucket rather than being silently dropped.
export function getMissedRentByAnsvarig(missedRent: MissedRentRow[]): AnsvarigBucket[] {
  const totals = new Map<string, number>();
  for (const row of missedRent) {
    const label = row.ansvarig.trim() || "Ingen ansvarig";
    totals.set(label, (totals.get(label) ?? 0) + row.totalMissat);
  }
  return Array.from(totals, ([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);
}

export type Bestandsoversikt = {
  bostader: number;
  forstahand: number;
  andrahandsgaster: number;
  inneboende: number;
  hyresgasterTotalt: number;
  bostaderPerFastighet: Array<{ label: string; count: number }>;
  bostaderPerTyp: Array<{ label: string; count: number }>;
};

export function getBestandsoversikt(
  rentalObjects: RentalObject[],
  tenants: Tenant[],
  andrahandsgaster: Andrahandsgast[]
): Bestandsoversikt {
  const perFastighet = new Map<string, number>();
  const perTyp = new Map<string, number>();
  for (const object of rentalObjects) {
    perFastighet.set(object.fastighet, (perFastighet.get(object.fastighet) ?? 0) + 1);
    const typ = object.typ.trim() || "Okänt";
    perTyp.set(typ, (perTyp.get(typ) ?? 0) + 1);
  }
  const inneboende = andrahandsgaster.filter((person) => person.typ === "inneboende").length;
  return {
    bostader: rentalObjects.length,
    forstahand: tenants.length,
    andrahandsgaster: andrahandsgaster.length - inneboende,
    inneboende,
    hyresgasterTotalt: tenants.length + inneboende,
    bostaderPerFastighet: Array.from(perFastighet, ([label, count]) => ({ label, count })).sort(
      (a, b) => a.label.localeCompare(b.label, "sv")
    ),
    bostaderPerTyp: Array.from(perTyp, ([label, count]) => ({ label, count })).sort(
      (a, b) => b.count - a.count
    ),
  };
}

export type StatusBucket = { label: string; count: number };

const APARTMENT_STATUS_LABELS: Record<ApartmentStatus, string> = {
  ledig: "Ledig",
  kontaktad: "Kontaktad",
  redo_for_kontrakt: "Redo för kontrakt",
  arkiverad: "Arkiverad",
};

// vacantApartments already excludes "arkiverad" (see getLedigaLagenheter),
// so this reads as the active leasing funnel, not the whole apartment
// history. Ordered ledig → kontaktad → redo_for_kontrakt to match the
// pipeline's actual progression, not alphabetically or by count.
const APARTMENT_STATUS_ORDER: ApartmentStatus[] = ["ledig", "kontaktad", "redo_for_kontrakt", "arkiverad"];

export function getLagenheterPerStatus(vacantApartments: Apartment[]): StatusBucket[] {
  const counts = new Map<ApartmentStatus, number>();
  for (const apartment of vacantApartments) {
    counts.set(apartment.status, (counts.get(apartment.status) ?? 0) + 1);
  }
  return APARTMENT_STATUS_ORDER.filter((status) => counts.has(status)).map((status) => ({
    label: APARTMENT_STATUS_LABELS[status],
    count: counts.get(status)!,
  }));
}
