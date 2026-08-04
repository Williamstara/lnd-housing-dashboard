# TODO

Concrete, verified work only. See `docs/HANDOFF.md` for current repository
state and the exact next step.

## Next

- **Visually verify the responsive UX remake.** `/statistik` at desktop
  width is now verified authenticated in a real browser (all 8 chart cards
  render, no console/hydration errors). Still outstanding: tablet (768 px)
  and phone (390 px) layouts across the rest of the app, keyboard operation,
  and loading/empty/error/success states — `resize_window` did not change
  the captured viewport in the last session's environment, so mobile
  couldn't be screenshotted there.
  **Acceptance criteria:** no horizontal page overflow; phone data is shown
  as cards with matching pagination; the desktop sidebar and mobile drawer
  are keyboard-operable; the 272 px/72 px sidebar toggle does not overlap or
  clip content and exposes labels through tooltips; meaningful findings from
  the web-design-guidelines audit are fixed.
- **Clean up inconsistent `RentalObject.typ` values for nation `LND`.**
  The new "Bostäder per typ" statistik chart surfaced real data-quality
  issues: `"Dubblett"` and `"dubblett"` are counted as separate categories,
  and some rows have bare `"1"`/`"2"` values with no clear meaning. This is
  a source-data fix (via `/databas`), not a code fix.
- **Save and re-test the apartments Excel-import mapping for nation `LND`.**
  The last verified database state had `imports.apartments` undefined. The
  verified mapping for the `Lediga (kladd)` sheet is:
  Lägenhetsnummer=A, Storlek=B, Objekttyp=C, Antal rum=D, Ledig fr.o.m.=E,
  Årshyra=F, Hyresrabatt=blank, Hyresreduktion=G, Årshyra med red.=H,
  Månadshyra=N, Hyresgäst=I, Personnummer=J, E-post=K, Telefon=L, and
  Kontonummer=M. Do not persist personal sample rows.

## Later

- **Fix stale building-name lookup tables** in `lib/laundry-account.ts` and
  `lib/rentalobjects.ts`. Prefer the existing `fastigheter.prefixes` data
  over another hardcoded map.
- **Add `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` to
  `.env.local.example`.** They are read by the Gmail OAuth routes but absent
  from the example.
- **Clean up the pre-existing lint baseline:** 7
  `react-hooks/set-state-in-effect` errors and the unused `_idToken` warning
  in `lib/auth0.ts`.
- **Consolidate duplicated Excel cell parsers only when a real bug requires
  it.** Five importers still own small local string/number helpers; there is
  no current correctness failure from that duplication.

## Blocked

- Rendered UX completion is blocked on an available authenticated browser
  session. Build and static validation are otherwise clean.

## Completed recently

- Application-wide responsive layout, left navigation, mobile cards, shared
  10-item pagination, responsive Excel previews, standardized MUI dialogs and
  search inputs, explicit resident/second-hand type, and expanded statistics.
- Apartments Excel import, per-nation mappings and building aliases/prefixes,
  correct Excel dates and reduction signs, and per-row skip reasons.
