# Architecture

Describes the system as currently implemented, with file paths as evidence.
Items that couldn't be confirmed from the repository alone are marked
`Needs verification`. See `AGENTS.md` for conventions and constraints;
this file describes *what exists*, not *how to write more of it*.

## Entry points

- `app/layout.tsx` — root layout. Loads the Auth0 session
  (`auth0.getSession()`), wraps the app in MUI's `AppRouterCacheProvider` +
  `ThemeProvider` (`lib/theme.ts`) + `CssBaseline`, then Auth0's
  `Auth0Provider` (client-side session context), then renders `NavBar`
  (`components/NavBar.tsx`) and `{children}`.
- `proxy.ts` (repository root) — Next.js 16's replacement for
  `middleware.ts`. Runs on every request matched by its `config.matcher`
  (everything except `_next/static`, `_next/image`, `favicon2.ico`, and
  common image extensions). Responsibilities, in order:
  1. `auth0.middleware(request)` — mounts `/auth/login`, `/auth/logout`,
     `/auth/callback`, `/auth/profile`, `/auth/access-token`,
     `/auth/backchannel-logout`, and keeps the session cookie fresh.
  2. Skips the checks below for `/api/**`, `/auth/**`, `/nationsid-saknas`,
     and `/admin` (see code comment for why each is excluded).
  3. Redirects a logged-in user with no `nationsID` claim to
     `/nationsid-saknas`.
  4. Redirects a logged-in user whose *only* role is `vaktmastare` to
     `/todo` (see `lib/roles.ts`'s `isRestrictedToTodo`).
- `app/page.tsx` — the home page (`/`), behind
  `auth0.withPageAuthRequired`. Shows a welcome header and `NavGrid`
  (`app/_components/nav-grid.tsx`, built from `lib/nav-links.tsx`).
- Every other feature route under `app/*/page.tsx` is also wrapped in
  `auth0.withPageAuthRequired` and follows the same shape — see "Major
  components" below.

## Major components (routes)

Each of these is `app/<name>/page.tsx` (+ `actions.ts` for mutations),
rendering one or more `components/*Table.tsx` / `components/*Dialog.tsx`
client components. Swedish label shown in the app's nav is in parentheses.

| Route | Purpose |
|---|---|
| `app/lediga-lagenheter` | Available apartments ("Lediga lägenheter") — the main leasing pipeline: list → contact → send to contract. `components/ApartmentsTable.tsx`, `components/ApartmentFormDialog.tsx`, `components/ApartmentInterestDialog.tsx`, `components/ApartmentExcelImport.tsx`, `components/LaundryAccountDialog.tsx`. |
| `app/hyresgastlista` | Tenants and second-hand tenants ("Hyresgästlista"). `components/TenantsTable.tsx` + `components/AndrahandsgasterTable.tsx`, each with a form dialog and an Excel import dialog. |
| `app/databas` | Full rental-object database ("Databas") — specs/pricing per lägenhetsnummer, independent of current occupancy. `components/RentalObjectsTable.tsx`, `components/RentalObjectExcelImport.tsx` (supports a single-sheet mode and an admin-defined multi-tab mode). |
| `app/besiktningar` / `app/arkiv` (besiktningar tab) | Inspections. `components/BesiktningarTable.tsx`, `components/ArkivBesiktningarTable.tsx`, `components/BesiktningarExcelImportDialog.tsx`. |
| `app/redo-for-kontrakt` | Apartments in the "sent to contract" stage. `components/ContractsReadyTable.tsx`. |
| `app/arkiv` | Signed/archived contracts. `components/ArchiveTable.tsx`. |
| `app/uppsagning` | Tenant notice/termination flow. `components/ConfirmUppsagningDialog.tsx`, `components/UppsagningTable.tsx`. |
| `app/fastigheter` | Buildings ("Fastigheter") — the registry every other feature's `fastighet` field is validated against. `components/FastigheterTable.tsx`. |
| `app/statistik` | Missed-rent and other statistics. `components/StatistikOverview.tsx`, `components/charts/*`. |
| `app/mallar` | Email templates. `components/email/TemplateEditorDialog.tsx`. |
| `app/epost` | Compose/send email to a recipient group. `components/email/SendMailClient.tsx`, `RecipientGroupPicker.tsx`. |
| `app/planritningar` | Floor plan PDF upload/storage per lägenhetsnummer. `components/email/FloorPlanCard.tsx`, `UploadConfirmDialog.tsx`. |
| `app/profil` | User profile — Gmail connection status. `components/email/ProfileGmailSection.tsx`. |
| `app/todo` | Shared todo list. `components/TodoList.tsx`. |
| `app/admin` | Cross-nation admin: table column config, Excel import column mappings, fastighet name aliases, rental-object multi-tab groups, user role/nationsID assignment. Admin-role only. `components/AdminPage.tsx`, `components/AdminShell.tsx`, `components/AdminUsersPanel.tsx`. |
| `app/nationsid-saknas` | Explanation page for a logged-in user with no `nationsID` claim. |

## Module responsibilities (`lib/`)

One file per MongoDB collection, `server-only`, typed CRUD:
`lib/apartments.ts` (`apartments`), `lib/tenants.ts` (`tenants`),
`lib/andrahandsgaster.ts` (`andrahandsgaster`), `lib/rentalobjects.ts`
(`rentalobjects`), `lib/fastigheter.ts` (`fastigheter`),
`lib/besiktningar.ts` (`besiktningar`), `lib/todos.ts` (`todos`),
`lib/uppsagningar.ts` (`uppsagningar`), `lib/missed-rent.ts`
(`missed-rent`), `lib/mail-templates.ts` (`mail-templates`),
`lib/floor-plans.ts` (`floor-plans`), `lib/gmail-tokens.ts`
(`gmail-tokens`), `lib/recipient-groups.ts`, `lib/statistik.ts`,
`lib/nation-settings.ts` (`nations` — see below), `lib/app-users.ts` (talks
to the Auth0 Management API, not MongoDB).

Not server-only (imported by client components too):
- `lib/table-columns.ts` — pure types + defaults + resolver helpers for
  every admin-configurable, per-nation setting (`NationSettings`,
  `ImportMapping`, `FastighetAlias`, `RentalObjectTabGroup`, and the pure
  functions `resolveColumns`, `resolveImportMapping`,
  `resolveFastighetAliases`, `resolveFastighetName`,
  `applyFastighetAlias`, `resolveFastighetFromPrefix`,
  `excelDateCellToISO`, `columnIndexToLetter`/`columnLetterToIndex`,
  `describeMapping`, `mappingToLookup`). `lib/nation-settings.ts` wraps
  this with the actual Mongo-touching CRUD (`getNationSettings`,
  `saveTableSettings`, `saveImportMapping`, `saveFastighetAliases`,
  `saveRentalobjectTabGroups`, `setRentalobjectsMultiTab`) and re-exports
  the pure pieces so callers only need one import path server-side.
- `lib/roles.ts`, `lib/nations.ts` — read Auth0 custom claims; used both in
  Server Components/Actions and client components (e.g. `NavBar`).
- `lib/nav-links.tsx` — the nav structure (`app/_components/nav-grid.tsx`,
  `components/NavBar.tsx`).
- `lib/mail-utils.ts` — pure string/placeholder helpers for email templates.
- `lib/use-column-visibility.ts` — a client-only `localStorage`-backed hook
  for per-user column show/hide state (independent of the admin-configured
  column *set*, which is per-nation and server-stored).
- `lib/export-xlsx.ts` — client-side "export table to .xlsx" helper.

## Data flow

1. A route's `page.tsx` (Server Component, wrapped in
   `auth0.withPageAuthRequired`) calls `requireNationsIdOrRedirect`, then
   fetches everything the page needs in parallel via `Promise.all`,
   resolving admin-configured settings against `DEFAULT_*` fallbacks.
2. Data is passed as props into a `"use client"` `*Table.tsx` component,
   which owns local UI state (search, sort, pagination, which dialog is
   open) and renders `*FormDialog.tsx` / `*ExcelImportDialog.tsx` children.
3. A user action calls a Server Action from `app/<route>/actions.ts`. The
   action re-derives `nationsId` (and checks role, if restricted) from the
   session — **never trusts a nationsId passed from the client** — sanitizes
   input, calls the matching `lib/*.ts` function, and calls
   `revalidatePath(...)` for every page the change could affect (a change in
   one collection often has to invalidate more than one route — e.g. saving
   a `fastigheter` prefix revalidates both `/fastigheter` and
   `/lediga-lagenheter`).
4. Next.js re-renders the affected Server Component(s) on next navigation/
   revalidation, flowing fresh data back down as props.

Excel import specifically (see `AGENTS.md` "Coding conventions" for the
shared shape): the workbook is read and parsed **entirely in the browser**
(`xlsx` package, `FileReader`) — no file is ever uploaded to the server.
Only the parsed, already-validated JSON rows are sent to a Server Action.

## State and persistence

- **MongoDB**, one database, many collections — see the table above. No
  ORM; each `lib/*.ts` file defines its own TS types for documents and maps
  `_id: ObjectId` to a string `id` on read.
- **Every collection is scoped by a `nationsID` string field.** See
  `lib/mongodb.ts`'s `INDEX_SPECS` for the authoritative list of indexed
  collections and their query-shape-derived compound indexes (all leading
  with `nationsID`).
- Index creation (`ensureIndexes` in `lib/mongodb.ts`) runs once per cold
  start, lazily on first `getDb()` call, and is deliberately non-fatal on
  failure (a restricted DB user just means unindexed queries, not an outage).
- Floor plans and mail-template attachments are stored as MongoDB `Binary`
  directly in their documents (`lib/floor-plans.ts`, `lib/mail-templates.ts`)
  — no external object storage (e.g. S3/Vercel Blob) is used.
- `lib/use-column-visibility.ts` is the one piece of client-side persistent
  state (`localStorage`, keyed per table), independent of server state.

## APIs and external services

- **Auth0** — authentication (`@auth0/nextjs-auth0` v4, `lib/auth0.ts`) and,
  separately, the **Auth0 Management API** via M2M client credentials
  (`lib/app-users.ts`) for the admin page's user/role/nationsID assignment
  UI (list users, assign roles, assign nationsID, delete user).
- **A second, independent Auth0 tenant** for laundry-room account
  provisioning (`lib/laundry-account.ts`, `LAUNDRY_AUTH0_*` env vars) — not
  the same tenant used for app login. Creates/replaces a laundry-system user
  account per tenant, keyed by lägenhetsnummer, with a building code
  (`GH`/`NH`/`FH`/`A`–`D`) resolved from the apartment's `fastighet` string.
  `Needs verification`: as of the last check in this repo's history, the
  building-code lookup tables in this file (`FASTIGHET_BUILDING`,
  `FASTIGHET_LAUNDRY_BUILDING`) and the lägenhetsnummer-prefix table in
  `lib/rentalobjects.ts` (`FASTIGHET_PREFIXES`) still use an **old, obsolete
  long-form fastighet naming scheme** (e.g. `"Arkivet (223 59, Lund)"`) that
  does not match the short names actually stored in the `fastigheter`
  collection today (e.g. `"Arkivet"`). This was found and explicitly
  **not** fixed in this session (out of the agreed scope) — see
  `docs/TODO.md`.
- **Google (Gmail API)** via `googleapis` — OAuth2 connect flow
  (`app/api/auth/gmail/*`), refresh tokens stored per-user in
  `gmail-tokens`; outgoing mail is sent through a `nodemailer` transport
  configured with those OAuth2 credentials (`app/api/send-mail/route.ts`).
- **MongoDB Atlas** — `Needs verification` for the exact hosting/plan, but
  `lib/mongodb.ts`'s connection-pool comments and the `mongodb.net` shard
  hostnames seen in a real `.env.local` during this session confirm Atlas
  is the actual database host (not a local/self-hosted instance in
  production).

## Authentication and authorization

- Login/session: Auth0 (`lib/auth0.ts`). A custom `beforeSessionSaved` hook
  is required to keep two custom ID-token claims from being stripped by the
  SDK's default allowlist — see the code comment there. Without it, roles
  and nationsID silently disappear from `session.user`.
- **Multi-tenancy claim**: `NATIONS_ID_CLAIM` (`lib/nations.ts`) —
  `https://lnd-housing-dashboard/nationsID`. Set by an Auth0 Action (not in
  this repo). `getNationsId`/`requireNationsId`/`requireNationsIdOrRedirect`
  are the three access patterns (client-safe read, throw-in-Server-Action,
  redirect-in-Server-Component).
- **Roles claim**: `ROLES_CLAIM` (`lib/roles.ts`) —
  `https://lnd-housing-dashboard/roles`. Known roles: `ekonomi`, `admin`,
  `husvd`, `husforman`, `vaktmastare`. `admin` satisfies every `hasRole`
  check (superuser). `vaktmastare` is access-*restricting*
  (`isRestrictedToTodo`) — enforced only in `proxy.ts` and reflected in nav
  visibility, not re-checked on every page.
- Page-level guards: `auth0.withPageAuthRequired` (must be logged in) +
  `requireNationsIdOrRedirect` (must have a nationsID) +, for admin-only
  pages, `requireAdminOrRedirect`.
- Action-level guards: each `actions.ts` defines its own
  `requireUser`/`requireXRole` helper that re-derives `nationsId` from the
  session and throws (not redirects) on failure — the client catches the
  thrown `Error.message` and displays it in an `Alert`.

## Configuration and environment variables (names only)

See `.env.local.example` and the "Security and data-handling rules" section
of `AGENTS.md` for the full, verified list. Grouped by service: Auth0 app
login (`APP_BASE_URL`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`,
`AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`), Auth0 Management API
(`AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET`), MongoDB (`MONGODB_URI`,
`MONGODB_DB`), Gmail (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` — **not**
currently in `.env.local.example`, a verified documentation gap), laundry
Auth0 tenant (`LAUNDRY_AUTH0_DOMAIN`, `LAUNDRY_AUTH0_MGMT_CLIENT_ID`,
`LAUNDRY_AUTH0_MGMT_CLIENT_SECRET`, `LAUNDRY_AUTH0_CONNECTION`).

## Error handling

- Server Actions throw a plain `Error` with a Swedish, user-facing message;
  the calling client component wraps the action in `try/catch` and renders
  the message in an MUI `<Alert severity="error">`.
- Bulk operations (Excel imports) sanitize **per row**, catching and
  recording each row's error individually so one bad row doesn't fail the
  whole batch — see `importApartmentsFromExcelAction` in
  `app/lediga-lagenheter/actions.ts` and the equivalent `bulkUpsert*`
  functions for the pattern.
- Route Handlers (`app/api/**`) return `Response.json({ error }, { status })`
  rather than throwing.
- `lib/mongodb.ts`'s index creation swallows failures on purpose (see
  "State and persistence" above).

## Testing structure

**None exists.** No test framework is installed; no `test` script in
`package.json`. Do not assume otherwise. See "Validation requirements" in
`AGENTS.md` for what actually substitutes for automated tests in this repo.

## Deployment and runtime structure

`Needs verification` — no `vercel.json`/`.vercel/` found in the repository,
so the exact deployment target isn't confirmed from the repo alone. Strong
circumstantial evidence points to Vercel: `README.md` is the stock
`create-next-app` boilerplate (which recommends Vercel), and
`lib/mongodb.ts` explicitly caps its connection pool with comments about
serverless instances each opening their own pool.

## Known technical limitations

- No automated tests.
- No schema validation beyond TypeScript types — documents can drift from
  the current type shape (e.g. `Fastighet.prefixes` is absent on documents
  created before that field existed; every reader must default it).
- Four Excel-importer dialogs (`ExcelImportDialog.tsx`,
  `AndrahandsgastExcelImportDialog.tsx`, `BesiktningarExcelImportDialog.tsx`,
  `ApartmentExcelImport.tsx`, `RentalObjectExcelImport.tsx`) each define
  their own local `cellStr`/`cellNum`/`cellDate`-style cell-parsing helpers
  rather than sharing one utility module — only the date-cell fix
  (`excelDateCellToISO`) and the fastighet-name resolution helpers have
  been centralized in `lib/table-columns.ts` so far. Duplication risk for
  future bugs in the un-shared helpers.
- `lib/laundry-account.ts` and `lib/rentalobjects.ts` contain hardcoded
  fastighet-name lookup tables using an obsolete long-form naming scheme —
  see "APIs and external services" above and `docs/TODO.md`. Verified
  broken for any fastighet other than the one whose lookup has a
  string-`.includes()` fallback.
- The Auth0 Action that sets the `nationsID`/`roles` custom claims is not
  version-controlled — it can only be inspected/changed in the Auth0
  dashboard, and its exact current script is `Needs verification` from the
  repo alone (code comments document the *expected* shape, not a guarantee
  it matches what's actually deployed in Auth0).
