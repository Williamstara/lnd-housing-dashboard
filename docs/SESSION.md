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
  real browser verification of the new statistics charts; affected every
  donut chart on the page (including the pre-existing Uthyrningsgrad one),
  not just the new one. Fixed with a template string.

## Validation status

- `npx tsc --noEmit --incremental false`: clean.
- `npm run check:statistik`: clean; verifies the tenant-count semantics,
  building/`typ` aggregation with synthetic, non-personal data (fixtures
  were briefly out of sync with the `typ` field this session — fixed, see
  `docs/DECISIONS.md`).
- `npm run lint`: unchanged baseline of 7
  `react-hooks/set-state-in-effect` errors and 1 unused-argument warning.
- `git diff --check`: clean apart from line-ending notices for existing
  skill files and touched files.
- Rendered verification of `/statistik` and `/besiktningar` at desktop width
  (authenticated, real `LND` data) has been done via Claude in Chrome across
  this and the prior session. Mobile/tablet screenshots remain outstanding
  — `resize_window` didn't change the captured viewport earlier this
  session, and by the end of this session the browser tools (`computer`
  screenshot, `find`, `read_page`) started returning errors/empty results
  entirely (an extension-side issue — `get_page_text` and
  `read_console_messages` kept working throughout). See `docs/HANDOFF.md`.

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

## Out-of-milestone work done this session

Several `/besiktningar` and `/statistik` features were added on user request,
unrelated to the responsive-redesign milestone above. Full reasoning for
each lives in `docs/DECISIONS.md`; short summary:

- **Besiktningar bulk-select-by-date**: pick a besiktningsdatum, every
  matching row auto-selects (holds until the date changes or "Avmarkera
  alla"), and — after fixing a bug where each bulk action silently cleared
  the selection — the same held selection now survives running klar-för-
  betalning → betalning gjord → arkivera in sequence.
- **Besiktningar "Status" bar**: a plain MUI segmented/stacked progress bar
  (Obehandlade/Klara för betalning/Betalda) with a legend — after trying,
  and being asked to remove, both a donut chart and a hand-rolled line
  chart first.
- **Besiktningar archiving is now husvd/admin only** (ekonomi keeps
  `ARCHIVE_ROLES` everywhere else in the app — this was scoped to
  besiktningar specifically, not a global role change).
- **Missade hyror can be added directly from Databas**, not just Lediga
  lägenheter, for rent missed on units with no `Apartment` record at all
  (e.g. an occupied unit whose tenant didn't pay). Requires a manually
  supplied "missed since" date since `RentalObject` has no `ledigFrom`.
- **Besiktningar gained a shared "Övriga anteckningar" note field**,
  alongside the existing vaktmästare/husförman notes — open to any
  authenticated nation user (husförman/husvd/ekonomi included), matching
  how the other two note fields already worked; no new role gate needed.
- **Extracted `components/charts/SegmentedBar.tsx`** from besiktningar's
  inline status bar, and used it again for a "Per ansvarig" breakdown
  inside `/statistik`'s Missade hyresintäkter card — the summed missed-rent
  **kr amount** per ansvarig (not a case count; corrected after user
  feedback), via a new `getMissedRentByAnsvarig` in `lib/statistik.ts`.
