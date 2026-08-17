# Handoff

Short-lived handoff for the next coding agent. Repository state and validation
were verified immediately before writing this file.

## Current objective

None — the public landing page (see `docs/SESSION.md`/`docs/DECISIONS.md`)
is complete and live-verified in a real browser. The next objective is
whatever the user asks for next.

## Completed this session

Full detail: `docs/DECISIONS.md`'s "Public landing page at `/`" entry.
Summary:

1. `app/layout.tsx` no longer renders `NavBar` unconditionally — it's gated
   on `getCurrentUserId()` (`lib/active-nation.ts`), so signed-out routes
   (`/`, `/sign-in`, `/sign-up`, `/nationsid-saknas`) no longer show the
   dashboard sidebar chrome around them.
2. `app/page.tsx` dropped `auth.protect()`; it now branches itself —
   signed-out renders new `app/_components/landing-page.tsx` (explains the
   app, feature highlights from `lib/nav-links.tsx`, "Logga in" CTA to
   `/sign-in`); signed-in renders the exact same dashboard overview as
   before, unchanged. Same URL (`/`) for both.
3. Fixed a real bug hit along the way: `LandingPage` had to be a Client
   Component (`"use client"`) — MUI's `Button` with `component={Link}` fails
   with "Functions cannot be passed directly to Client Components" when
   rendered from a Server Component, same reason `NavGrid` is already
   `"use client"`.

This also incidentally fixes the sign-out UX complaint from the prior
session (skeleton dashboard chrome behind the Clerk sign-in card) — `/sign-in`
no longer renders inside `NavBar`'s shell at all now, regardless of the
earlier hard-navigation fix in `NavBar.tsx`'s `handleSignOut`.

## Validation status

- `npx tsc --noEmit` — clean.
- `npm run lint` — at the documented baseline: 7 pre-existing
  `react-hooks/set-state-in-effect` errors, 0 warnings. Nothing new.
- Live-verified in a real Chrome browser via `claude-in-chrome`: signed-out
  `/` renders the new landing page (hero + 3 feature-highlight cards, no
  NavBar), clicking "Logga in" navigates to a clean `/sign-in` (Clerk's card
  centered on a bare background, no dashboard chrome behind it), console
  clean at every step. **Not verified**: the full signed-in round-trip
  (landing → sign-in → dashboard overview) — the browser session reached
  Google's real account-chooser screen (two real personal Google accounts)
  and stopped there deliberately, since picking an account to authenticate
  with is the user's call, not something to click through unattended. The
  signed-in branch of `app/page.tsx` is unchanged code (copied verbatim from
  the prior working version), so this is a low-risk gap, but a real
  click-through by the user (or a future agent once signed in) would close
  it fully.
- Mobile viewport check was attempted but `resize_window` didn't visibly
  affect the captured screenshot in this session's browser tool (known
  flakiness, not a code issue) — the landing page reuses the exact same
  responsive grid pattern (`gridTemplateColumns: { xs: "1fr", md: ... }`)
  already proven working elsewhere in this app (`NavGrid`), so this is a low
  risk, not a confirmed-working mobile check. Worth a real mobile check next
  session if the user wants full confidence.

## Important gotchas for the next agent

1. **`NavBar` is now conditional on `getCurrentUserId()` in
   `app/layout.tsx`, not path-based.** If a new route needs to show/hide the
   dashboard chrome independent of auth state, this conditional won't cover
   it — see the "Consequences" note in `docs/DECISIONS.md`'s landing-page
   entry for when to revisit a proper route-group split instead.
2. **Passing `component={Link}` (or any function) as a prop into an MUI
   component from a Server Component throws at runtime, not at type-check
   time** — `npx tsc --noEmit` stayed clean through this exact bug. Any new
   Server Component that wants `<Button component={Link}>` /
   `<ListItemButton component={Link}>` etc. must be `"use client"`, matching
   `NavGrid.tsx` and now `landing-page.tsx`.
3. Everything from the prior Clerk-migration handoff still applies (Clerk
   session-claims not JWT templates, `auth.protect()` per-page not
   middleware, `lib/active-nation.ts` as the one shared home for
   server-side Clerk reads) — see git history / `docs/DECISIONS.md`'s
   "Auth0 → Clerk migration" entry if touching auth code again.

## Current Git and working-tree state

Nothing from this session (or any prior session, going back through the
Clerk migration and earlier) has been committed — check `git status` for the
exact list. Confirm with the user how they want this split into commits
before running `git add`/`git commit`.

## Remaining work

1. **Close the signed-in round-trip verification gap** noted above — have
   the user (or a future agent, once signed in) click through
   landing → `/sign-in` → dashboard overview once, to fully confirm the
   signed-in branch renders exactly as before.
2. Everything already listed in the prior Clerk-migration handoff remains
   outstanding and unrelated to this session's work: real second-user
   verification (`husforman@lundsnation.se`), `service_role` grants gap on
   `gmail_tokens`/`todos`, `AUTH0_*` env var cleanup, the second sister app's
   Clerk migration.
3. Everything already in `docs/TODO.md` from before this session remains
   outstanding.
4. Commit the working tree — only when the user explicitly asks.

## Blockers

None.

## Timestamp

2026-08-14 (local, per this session's clock)

## Current agent

Claude Code
