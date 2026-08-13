
Durable, actionable roadmap of what would need to change for this app to be
sold to a second organization with a materially different workflow, beyond
nation `LND`'s specific one. **Nothing in this file has been implemented —
it's a plan for a future session, not current state.** See `docs/TODO.md`
for concrete, already-scoped near-term work; see this file for the larger
"what would block a second customer" picture.

Written 2026-08-13, immediately after the MongoDB→Supabase migration
(`docs/SESSION.md`, `docs/DECISIONS.md`). The app is now on Postgres/RLS,
which makes several of these items (especially the permission-model and
localization ones) meaningfully easier to build well than they would have
been on the old Mongo/schemaless model — noted per item below.

## How to use this file

Each item lists: what's hardcoded today (with file references), why it
blocks a second customer, and a suggested direction — not a full spec.
Pick items independently; they don't have to happen in this order, though
the tiering reflects roughly how foundational vs. contained each one is.
Re-verify file paths/line numbers before acting on them — this document
will drift as the code changes.

---

## Tier 1 — Foundational (architecture-level; decide consciously before scaling)

These aren't bugs and don't need fixing before a second customer with a
*similar* workflow — they matter if a second customer's workflow is
*structurally* different, or specifically for you as the SaaS operator.

### 1.1 The property hierarchy (`fastighet` → `lagenhetsnummer`) is baked into the schema itself, not just labels

Every table's actual join key — `missed_rent`, `besiktningar`, `todos`
assignment, Excel-import row matching — is `lagenhetsnummer`, matched
against a flat `fastighet` string. There's no abstraction for a different
property hierarchy: a portfolio-management org (portfolio → building →
floor → unit) or a hotel-style room-only org would need schema changes and
edits to most `lib/*.ts` files, not a configuration change.

**Direction**: not worth speculatively generalizing without a real second
customer whose hierarchy actually differs — YAGNI applies here. Worth
revisiting only when a concrete second customer's data model is known.

### 1.2 Exactly one `nationsID` per Auth0 user — no multi-org support for the SaaS operator

`lib/nations.ts`'s `getNationsId` reads a single string claim. There's no
notion of a user (specifically: you, running this as a SaaS) belonging to
multiple nations and switching context. Today, `assignNationsId` *moves* a
user from one nation to another rather than adding a second; the only
broader-access mechanism is the `admin` role, which bypasses nation
scoping entirely rather than letting someone "pick which org."

**Direction**: if you'll be operating/supporting multiple client orgs
yourself, this is worth solving before it's painful — e.g. a nation-switcher
for admin-role users, or a proper multi-nation membership model (Auth0
`roles` claim already supports arrays; nationsID could become an array too,
with a "currently active nation" selection stored client-side). Needs Auth0
Action changes (external to this repo) plus `lib/nations.ts` changes.

---

## Tier 2 — Permission model (touches every route; do this before adding more roles)

### 2.1 Role-gating is ~10 independently hand-written guard functions across 7 files, several literally duplicated

Full catalog as of this writing:

| File | Function | Role check |
|---|---|---|
| `app/besiktningar/actions.ts` | `requireHusvdOrEkonomiRole` | `HUSVD \|\| EKONOMI` |
| `app/besiktningar/actions.ts` | `requireArchiveRole` | `ARCHIVE_ROLES` (ekonomi/husvd/admin) |
| `app/besiktningar/actions.ts` | `requireHusvdRole` | `HUSVD` only |
| `app/fastigheter/actions.ts` | `requireHusformanRole` | `HUSFORMAN` |
| `app/statistik/actions.ts` | `requireHusformanRole` | `HUSFORMAN` — **duplicate of the above, same logic, separate copy** |
| `app/uppsagning/actions.ts` | `requireEkonomiRole` | `EKONOMI` |
| `app/lediga-lagenheter/actions.ts` | `requireEkonomiRole` | `EKONOMI` — **duplicate** |
| `app/lediga-lagenheter/actions.ts` | `requireHusformanRole` | `HUSFORMAN` — **duplicate** |
| `app/lediga-lagenheter/actions.ts` | `requireArchiveRole` | `ARCHIVE_ROLES` — **duplicate** |
| `app/admin/actions.ts` | `requireAdmin` | `ADMIN` |

`app/todo/actions.ts`, `app/hyresgastlista/actions.ts`,
`app/databas/actions.ts`, `app/arkiv/actions.ts` have no role gate at all
(any authenticated nation member).

**Direction**:
1. First, de-duplicate without changing behavior: move the three duplicated
   functions (`requireHusformanRole`, `requireEkonomiRole`,
   `requireArchiveRole`) into `lib/roles.ts` as shared exports, imported by
   every `actions.ts` that needs them. Zero behavior change, pure cleanup —
   safe to do immediately, independent of everything else in this file.
2. Then, if per-nation-configurable roles are wanted: replace the
   hardcoded `ROLES` constants and the `ARCHIVE_ROLES` list with a
   per-nation permission table — now that this is Postgres, a
   `nation_role_permissions(nations_id, role_name, permission_key)` table
   is a natural fit, with RLS able to read it directly if you ever want
   role checks to move into RLS too (today they're deliberately app-layer
   only — see `docs/DECISIONS.md`'s RLS-vs-app-layer-roles entry — revisit
   that decision only if this table makes it clearly better to do both).
3. Every route's `actions.ts` would then call one shared
   `requirePermission(session, "besiktningar.archive")`-style helper
   instead of a role name directly, with the role→permission mapping
   resolved per-nation. This is the biggest single change in this roadmap
   — budget real design time for it.

---

## Tier 3 — Workflow configurability

### 3.1 The leasing pipeline (`ApartmentStatus`) and besiktningar workflow are fixed state machines, not data

`ApartmentStatus = "ledig" | "kontaktad" | "redo_for_kontrakt" | "arkiverad"`
is a TypeScript union with transition logic hardcoded into named functions
(`markContacted`, `assignTenantAndSendToContract`, `archiveByLedigFrom`,
`removeFromKontrakt` in `lib/apartments.ts`), plus a matching Postgres enum
(`apartment_status` in `supabase/migrations/20260812231459_schema.sql`).
Besiktningar's payment workflow (`klarForBetalning` → `betalningGjord` →
archive) is similarly fixed, now enforced by two Postgres `check`
constraints (`besiktningar_betalning_requires_klar`,
`besiktningar_archive_requires_betalning`).

Also in this bucket: `lib/besiktningar.ts`'s `previousWorkday()` — "inspect
on the last weekday before move-in, skipping Sat/Sun" — is a specific
scheduling convention baked into code, not configuration.

**Direction**: this is the largest single architectural change in this
roadmap short of Tier 1, and shouldn't be done speculatively. A
nation-configurable ordered stage list (with per-transition role
requirements, replacing the fixed enum + named functions) is the right
shape *if and when* a second customer's pipeline genuinely differs in stage
count or order — don't build it against a hypothetical. Note the Postgres
`check` constraints would need to become data-driven too (or move into
application-layer validation) if the stage rules become configurable.

### 3.2 Nav structure is one static list for every nation

`lib/nav-links.tsx`'s `navLinks`/`NAV_GROUPS` are the same fixed set for
every nation — a nation without laundry-room accounts or Gmail sending
still sees every nav item pointing at those pages.

**Direction**: lowest-effort item in this tier. Add a per-nation feature-flag
column/JSONB field to the `nations` table (e.g. `enabled_features: string[]`),
filter `navLinks` by it in `NavBar`/`nav-grid.tsx`. Doesn't require touching
the underlying pages, just hiding entry points — a nation could still reach
a "disabled" page by direct URL unless routes are also guarded, which is a
reasonable v2 if this becomes a real support-burden.

### 3.3 Three separate, inconsistent fastighet-name-resolution mechanisms (one stale)

Already tracked in `docs/TODO.md`'s "Later" section — `lib/laundry-account.ts`
and `lib/rentalobjects.ts` each hardcode their own long-form fastighet-name
lookup tables, independent of the admin-configurable `fastighetAliases` +
`fastigheter.prefixes` mechanism (`lib/table-columns.ts`). This is a
correctness bug for `LND` today, not just a future-customer concern —
prioritize it above the rest of this roadmap regardless of SaaS plans.

**Direction**: consolidate onto `fastigheter.prefixes` +
`resolveFastighetFromPrefix`/`FastighetAlias`, deleting the two hardcoded
tables. See `docs/TODO.md` for the existing scoping note.

---

## Tier 4 — Admin config coverage gaps

### 4.1 Create/edit form dialogs bypass `NationSettings` entirely — deeper than the known "table-column config only covers two tables" gap

Even for `apartments`/`rentalobjects` (the two tables *with* admin column
config), that config only ever controls the **list view**. Every add/edit
dialog — `ApartmentFormDialog.tsx`, `RentalObjectFormDialog.tsx`,
`TenantFormDialog.tsx`, `AndrahandsgastFormDialog.tsx` — hardcodes its own
full field list, order, and labels directly in component code, with zero
connection to `lib/table-columns.ts`. Hiding a column from the list view
today does nothing to the form: a nation that doesn't track
`hyresreduktion`, for example, still gets it as a field every time they add
an apartment.

**Direction**: extend `NationTableSettings`/`resolveColumns` (already used
for list views) to also drive which fields a form dialog renders — the
`TableColumnConfig` shape (`key`, `label`, `visible`, `isCustom`) already
has what's needed; the form dialogs just need to read it instead of
hardcoding their field arrays. Natural follow-on to 4.2 below since both
need the same underlying config to be genuinely complete.

### 4.2 Table-column admin config only covers `apartments`/`rentalobjects` — Hyresgästlista, Arkiv, Uppsägning, Todo use the identical rendering pattern but aren't wired in

Confirmed low-effort: `TableKey` in `lib/table-columns.ts` is just
`"apartments" | "rentalobjects"` — extending it to the other four tables
that already follow the same `*Table.tsx` list-rendering shape is
mechanical, not a new pattern.

---

## Tier 5 — Hard integration dependencies (need rewriting, not configuring)

### 5.1 Gmail is the only supported email provider

`lib/gmail-tokens.ts`, `app/api/send-mail/route.ts`,
`components/email/ProfileGmailSection.tsx`/`SendMailClient.tsx` are
Gmail-OAuth-specific throughout — no `EmailProvider` interface or
equivalent seam exists. A customer wanting Outlook/SMTP/SendGrid needs this
written, not configured.

**Direction**: only worth doing when a real customer needs it — introducing
an abstraction for a single implementation is premature. If/when a second
provider is needed, extract an `EmailProvider` interface
(`{sendMail, listTemplatesAttachmentSupport, ...}`) that `lib/gmail-tokens.ts`
implements, add the new provider alongside it, and make the choice a
per-nation setting.

### 5.2 Laundry-room integration is unconditional and vendor-specific

The "create laundry account" button (`components/TenantsTable.tsx`,
`components/AndrahandsgasterTable.tsx`) renders on every tenant row for
every nation, with a specific password-generation convention (digits
extracted from the apartment number, `components/LaundryAccountDialog.tsx`)
hardcoded into UI copy. No per-nation flag exists to hide it for a nation
without this integration.

**Direction**: add a per-nation `enabled_features` flag (can share the
mechanism built for 3.2) to conditionally render the button. This alone
doesn't fix the vendor-specificity (`lib/laundry-account.ts`'s hardcoded
building-code tables are also stale — see `docs/TODO.md`) — treat as two
separable problems: "can a nation turn this off" (easy, do first) vs. "does
this generalize to a different laundry vendor" (hard, only worth it for a
real second vendor).

---

## Tier 6 — Localization (broad blast radius, low effort per item)

### 6.1 Currency is hardcoded to Swedish kronor in two layers

- The formatter itself: `components/StatistikOverview.tsx`'s
  `Intl.NumberFormat("sv-SE", ...)` plus a hardcoded `` `${x} kr` `` suffix.
- Static field labels baked directly into form dialogs:
  `ApartmentFormDialog.tsx` (`"Årshyra (kr)"`, `"Hyresrabatt (kr)"`, etc.),
  `RentalObjectFormDialog.tsx` (`"Målbildshyra (kr/år)"`, etc.).

### 6.2 Swedish locale (`sv`/`sv-SE`) hardcoded in 6+ sort/format call sites

`lib/nation-settings.ts`, `lib/app-users.ts` (×3), `lib/statistik.ts`,
`lib/mail-utils.ts` (×2), plus the `StatistikOverview.tsx` site above.

**Direction for both**: add `currency`/`locale` fields to `NationSettings`
(JSONB on the `nations` table already, low-cost to extend) with `"kr"`/
`"sv-SE"` as the defaults, so `LND` behaves identically until changed. Thread
a formatting helper (`formatCurrency(value, nationSettings)`) through the
handful of call sites above instead of the current ad-hoc
`Intl.NumberFormat`/string-template calls. Contained, mechanical work —
good candidate for a single focused session.

---

## Tier 7 — Minor / polish

### 7.1 Physical key-handover tracking is schema-level, not an optional workflow step

`nyckelInlamnad`/`nyckelHamtad` (`Apartment` type, `apartments` table) are
non-optional fields rendered as two dedicated toggle buttons on every
`ApartmentsTable.tsx` row for every nation — orgs using fobs/keyless entry
get two toggles with no meaning to them.

**Direction**: lowest priority in this file. If it ever matters, gate the
two buttons behind a per-nation `enabled_features` flag (same mechanism as
3.2/5.2) rather than removing the underlying columns — cheap to hide,
expensive to make fully optional at the schema level for no proven need.

### 7.2 Email template quick-insert variables are fixed to rental concepts

`components/email/TemplateEditorDialog.tsx`'s `VARIABLES` array
(`{{aptName}}`, `{{moveInDate}}`, `{{price}}`, `{{latestReply}}`) has no
equivalents for a different org's concepts. Partially mitigated already —
the same dialog supports typing an arbitrary `{{customName}}` token, so
this is a discoverability gap, not a hard block.

**Direction**: not worth fixing in isolation; revisit only alongside 5.1
(email provider work) if that ever happens, since template variables are
naturally part of that surface.

---

## Suggested sequencing if you do pick this up

Given none of this is urgent (one customer today, nothing here is broken
for `LND`), a reasonable order by effort-to-value ratio:

1. **3.3** (fastighet-name consolidation) — do regardless of SaaS plans, it's a live correctness bug.
2. **2.1 step 1** (de-duplicate the three copy-pasted role guards) — zero-risk cleanup, makes step 2/3 of that item easier later.
3. **6.1 + 6.2** (currency/locale) — contained, mechanical, one session.
4. **3.2 + 5.2's flag half + 7.1** (per-nation feature flags) — one shared mechanism covers three items.
5. **4.1 + 4.2** (extend admin config to forms and to the other four tables) — natural pair, moderate effort.
6. **2.1 steps 2-3** (real per-nation permission model) — only once you have a concrete second customer whose roles genuinely differ; don't speculate.
7. **1.1, 1.2, 3.1, 5.1** — architecture-level or hard-dependency items; only tackle when a real second customer's requirements force the question, not preemptively.

---

## Security audit

Run 2026-08-13, immediately after the Mongo→Supabase migration, using a
3-phase process: (1) a full identification pass over every changed file in
the migration, (2) independent false-positive filtering of each candidate
finding against a strict confidence bar (only findings scoring ≥8/10 on a
concrete-exploitability scale survive), (3) filtering out everything below
that bar. **Zero findings survived filtering** — nothing here rises to a
confirmed, exploitable vulnerability. One hardening recommendation is
documented below anyway, since it's genuinely worth fixing even though it
didn't meet the bar for a "vulnerability."

### What was verified as sound

- Every nation-scoped query across all 14 rewritten `lib/*.ts` files
  filters explicitly by `.eq("nations_id", nationsId)`, in addition to RLS
  — no missing-filter gaps found anywhere.
- Every table created in the schema migration has Row Level Security
  enabled with a correct tenant-isolation policy
  (`supabase/migrations/20260812231542_rls.sql`); `todo_subtasks` is
  correctly scoped by joining through its parent `todos` row;
  `gmail_tokens` is correctly scoped by `auth.jwt() ->> 'sub'` rather than
  `nations_id` (it's genuinely per-user), and every caller derives that
  `userId` from the server-side session, never from client input.
- `supabase/migrations/20260813001732_grants.sql` grants nothing to
  `anon`; only `authenticated` gets CRUD, matching the intended "every
  route requires an Auth0 session" model.
- Storage RLS policies correctly key off the first path segment
  (`nationsId`, always server-derived, never attacker-controlled), so
  tenant isolation at the Storage layer holds regardless of what filename
  a caller supplies.
- `has_role()` and `sync_todo_completion()` are declared
  `security invoker set search_path = ''`, avoiding search-path hijacking.
- No hardcoded secrets anywhere in the diff; `lib/supabase-server.ts` uses
  only the public/publishable key plus the Auth0-forwarded ID token — no
  service-role key in any normal request path.
- No SQL/NoSQL injection: every filter value goes through the Supabase
  query builder's parameterized methods (`.eq()`/`.in()`/etc.), never
  string-concatenated into a query.

### Investigated and ruled out

**Storage object paths built from unsanitized upload filenames**
(`lib/floor-plans.ts`, `lib/mail-templates.ts`, `lib/uppsagningar.ts` all
interpolate the raw uploaded filename into the Storage key with no
sanitization). Initially flagged as a possible path-traversal/arbitrary-
write issue. Ruled out on independent review: Supabase Storage's object
key is a flat string backing an S3-compatible store, not a filesystem path
— `..` in a filename becomes a literal, odd-looking key, not a traversal.
The RLS policy only ever checks the first path segment (the trusted,
server-set `nationsId`), so a crafted filename can't reach another
tenant's data; at worst a user can produce a strangely-named object inside
their *own* tenant's folder. Confidence 2/10 — filtered out.

**Raw Postgres/PostgREST errors reaching the browser** (every `lib/*.ts`
function does `if (error) throw error`, and the app's established
component pattern displays `err.message` directly in an Alert — so a
`PostgrestError`'s raw message, which can include constraint/table/column
names, now reaches end users on failure, e.g. a duplicate-`lagenhetsnummer`
unique-violation in `/databas`). Confirmed as a real, easily-reachable
regression from the MongoDB version (the old driver's errors were more
generic, and the specific unique constraint this trips didn't exist as a
DB-level rule before). **Ruled out as a "vulnerability" specifically**
because what leaks is internal schema/constraint naming — not PII, not
secrets, not another tenant's data — to a user who is already
authenticated and already has legitimate write access to that data.
Confidence 3/10 against the strict "concrete unauthorized-access/data-
breach" bar this review uses.

**Recommended anyway, as hardening** (not a tracked vulnerability): catch
`PostgrestError` at the `lib/*.ts` boundary and convert it to either a
fixed Swedish message or a small allow-listed set of known conditions
(unique violation → "denna post finns redan", FK/not-null → generic
"ogiltig data"), logging the full raw error server-side instead of
forwarding it to the client. This also happens to be good practice
independent of security — matches the existing pattern already used for
business-rule failures (e.g. `apartments.ts`'s `"Lägenheten hittades
inte."`) rather than leaving the Postgres-specific paths as an exception to
it. Low priority — not urgent, not a security finding, just tidiness worth
picking up if a session ends up in these files anyway.
