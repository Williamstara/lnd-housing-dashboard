# Handoff

## Current objective

Verify and polish the implemented Bostadskarta/block-plan milestone. The code,
database migrations and pure checks are complete; authenticated rendered UI and
cross-nation RLS verification remain.

## What exists

- New protected route and nav item: `/bostadskarta`.
- Floor CRUD, ordering, series regeneration and block-layout persistence,
  guarded by `fastigheter.manage`.
- Nation-scoped `building_floors` and `building_floor_templates`, with Clerk
  claim RLS, explicit grants, bounds/JSON constraints and fastighet cascade.
- Resident/rental-object matching without storing PII in layouts or templates.
- Shared 12-column block editor with:
  - apartment/common/corridor/blocked/empty blocks;
  - direct mouse, pen and touch movement using Pointer Events;
  - arrow-key movement and visible focus;
  - collision prevention in the UI and server validation;
  - selected-block inspector for label, size, duplicate and delete;
  - automatic collision-free placement of duplicates;
  - unique apartment-number enforcement on real floors.
- Fastigheter → Planmallar owns named template creation/edit/delete.
  Bostadskarta only applies templates to floors and rebinds generic apartment
  slots to the target floor's actual numbers.
- Legacy floors still render the earlier corridor until first converted.

## Main files

- `app/bostadskarta/page.tsx`, `actions.ts`, `loading.tsx`, `error.tsx`
- `components/Bostadskarta.tsx`
- `components/FloorBlockGridEditor.tsx`
- `components/FloorTemplateManager.tsx`
- `app/fastigheter/page.tsx`, `actions.ts`
- `components/FastigheterTable.tsx`
- `lib/building-floor-logic.ts`
- `lib/building-floors.ts`
- `lib/building-floor-templates.ts`
- `scripts/check-bostadskarta.mjs`
- `supabase/migrations/20260818120000_building_floors.sql`
- `supabase/migrations/20260818140000_floor_block_layouts.sql`

## Live database status

- Both Bostadskarta migrations are already applied. Do not push them again.
- Service-role floor/template CRUD passed; temporary rows were removed.
- Anon access was denied with 401.
- Missing verification: authenticated same-nation CRUD and authenticated
  cross-nation denial with real Clerk tokens.

## Last validation

- `npm run check:bostadskarta`: clean.
- `npx tsc --noEmit`: clean.
- Targeted ESLint on changed feature files: clean.
- `npm run lint`: exactly the known 7 unrelated baseline errors, 0 warnings.
- Production compilation: clean with a 4 GB Node heap.
- `git diff --check`: clean.
- `graphify update .`: complete.

## Next actions

1. Open a signed-in browser and test Fastigheter → Planmallar:
   create/edit/delete a template; add every block type; drag by mouse and touch;
   move by keyboard; edit labels; shrink to one cell; duplicate; attempt
   collision; save and reload.
2. Test `/bostadskarta`: empty building, building without floors, range
   `GH1001–GH1017`, multiple series, apply a template, apartment-number binding,
   save/reload, primary/secondary/roommate details and unmatched database number.
3. Check desktop, tablet and phone widths plus loading, empty, error, pending and
   success states. Inspect focus order, contrast and reduced motion.
4. Use Clerk tokens from two organizations to prove same-nation CRUD and
   cross-nation denial for both floor tables.
5. If stored layouts created before collision prevention exist, open and repair
   overlaps before saving; the server now correctly rejects overlapping JSON.

## Deliberately deferred

- Rotation, multi-select, undo/redo and arbitrary polygon/CAD geometry.
- Special handling for simultaneous edits; last write wins.
- Additional dependencies; the editor is MUI + native DOM/Pointer Events.

## Working tree

The repository is dirty and feature files are mostly untracked. Existing
changes belong to the user. Preserve `AGENTS.md`, `.codex/`, docs, graphify
output and unrelated migrations; never reset the worktree wholesale.
