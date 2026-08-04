# Current session / milestone

This file holds the current milestone's working memory. Replace it when the
milestone changes; durable reasoning belongs in `docs/DECISIONS.md`.

## Current milestone

Responsive UX remake of the full application: use the available desktop
width, move navigation into a left rail, replace wide tables with cards on
small screens, reduce default pagination to 10, standardize dialogs and
inputs, and expand the statistics overview.

## User problem being solved

The previous desktop layout left useful screen width unused and required too
much vertical scrolling. Dense tables did not translate well to phones, page
sizes defaulted to 25, navigation consumed the top edge, and statistics did
not provide a useful inventory/occupancy overview.

## Implemented scope

- Desktop navigation is a persistent 272 px left rail; phones use a compact
  app bar and temporary drawer. Desktop users can collapse the rail to 72 px;
  icons, tooltips, active state, profile, and logout remain available.
- Operational routes use full-width responsive containers. The home page
  groups destinations into compact work areas.
- Data tables use 10 rows per page by default. Their existing mobile card
  views use the same filtered and paginated slice; missing card views were
  added for templates and unassigned admin users.
- Excel previews share `components/ResponsivePreview.tsx`: table on desktop,
  labeled cards on phones, 10 items per page in both modes.
- Dialog chrome, field sizing, destructive confirmations, focus treatment,
  reduced motion, search labels, and mobile pagination were standardized in
  the MUI theme and affected components.
- The secondary-occupant model now has `typ: "andrahandsgast" |
  "inneboende"`. Existing records default to `andrahandsgast`.
- Statistics now show total homes, total tenants, residents by occupancy
  form, homes per building, homes per type (`typ`), vacant apartments per
  leasing-pipeline status, occupancy, missed rent, condition, and revenue.
  Total tenants means primary tenants plus `inneboende`; second-hand
  tenants remain separate.
- Heavy SheetJS import dialogs are dynamically loaded from their parent
  tables.
- Fixed a pre-existing hydration bug in `components/charts/DonutChart.tsx`:
  its segment `<title>` used `{s.label}: {s.value}` (a 3-child JSX array),
  which React cannot hydrate consistently for `<title>` elements. Found via
  real browser verification of the new statistics charts below; affected
  every donut chart on the page (including the pre-existing Uthyrningsgrad
  one), not just the new one. Fixed with a template string.

## Validation status

- `npx tsc --noEmit --incremental false`: clean.
- `npm run check:statistik`: clean; verifies the tenant-count semantics and
  building aggregation with synthetic, non-personal data.
- `npx next build`: clean on Next.js 16.2.10.
- `npm run lint`: unchanged baseline of 7
  `react-hooks/set-state-in-effect` errors and 1 unused-argument warning.
- `git diff --check`: clean apart from line-ending notices for existing
  skill files and touched files.
- Rendered verification of `/statistik` at desktop width (authenticated,
  real `LND` data) is done in this session via Claude in Chrome: all eight
  chart cards render, no console errors, no hydration mismatches after the
  `DonutChart` fix. Mobile-viewport screenshot verification was attempted
  but `resize_window` did not change the captured viewport size in this
  environment; the new cards reuse the exact same `Grid`/`ChartCard`
  primitives as the six pre-existing cards, so no new responsive behavior
  was introduced. Full desktop/tablet/phone review of the rest of the app
  (nav rail, dialogs, other tables) remains outstanding.

## Acceptance criteria

- [x] Left-side desktop navigation and mobile drawer.
- [x] Full-width operational pages.
- [x] Mobile cards and shared pagination for row-oriented UI.
- [x] Default page size is 10 everywhere pagination is used.
- [x] Consistent MUI dialogs and accessible search inputs.
- [x] Explicit second-hand/resident occupancy type.
- [x] Expanded, verified statistics semantics.
- [ ] Rendered desktop, tablet, and phone review with keyboard and loading,
      empty, error, and success states.

## Exact next step

Run the authenticated app in a browser and review representative desktop
(1440 px), tablet (768 px), and phone (390 px) widths. Fix only concrete
layout, keyboard, or accessibility issues found, then commit when requested.
