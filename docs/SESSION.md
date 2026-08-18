# Current session / milestone

## Current milestone

**Bostadskarta and reusable block-plan editor, implemented 2026-08-18.**

The feature is implemented but still needs authenticated rendered-browser and
cross-nation RLS verification. No controllable browser was available in the
delivery environment.

## Implemented

- `/bostadskarta` is a protected route available to ordinary signed-in users.
  It fetches fastigheter, floors, rental objects, primary tenants and secondary
  occupants in parallel and performs resident matching on the server.
- Resident matching uses exact apartment number first, then configured building
  prefixes. The client receives only apartment number, name, occupant type and
  match status; no contact details or personal numbers.
- Managers use the existing nation-configurable `fastigheter.manage`
  permission for every mutation. Every database query also filters explicitly
  by `nations_id`.
- Floors use complete numeric ranges such as prefix `GH`, start `1001`, end
  `1017`. The normal UI no longer exposes misleading zero-padding, while stored
  legacy `padTo` values remain readable.
- A floor may use the legacy corridor view or a 12-column block layout. Block
  types are apartment, common space, corridor, blocked area and empty room.
- `components/FloorBlockGridEditor.tsx` is shared by floor editing and template
  editing. Pointer Events provide direct mouse, pen and touch movement; arrow
  keys remain available.
- Blocks cannot overlap. Client movement/resizing rejects collisions and
  `validateLayoutBlocks()` rejects overlapping JSON before persistence.
- Selecting a block opens a separate inspector for label editing, resizing,
  duplication and deletion. Controls therefore remain usable for one-cell
  blocks. Copies are placed at the first free grid position.
- Numbered apartment blocks cannot be duplicated on an actual floor because an
  apartment number may occur only once. Generic apartment slots may be
  duplicated inside a template.
- Managers create, edit and delete reusable nation-scoped templates under
  Fastigheter → Planmallar. Bostadskarta only applies a saved template to a
  selected floor. Template apartment slots store no apartment number or
  resident data and bind in order to the target floor's apartment numbers.

## Database state

- `20260818120000_building_floors.sql` is applied live.
- `20260818140000_floor_block_layouts.sql` is applied live.
- Service-role CRUD passed for floors/templates; temporary verification rows
  were deleted. Anon access returned 401.
- Do not reapply these migrations. Authenticated same-nation CRUD and
  cross-nation denial still need verification with real Clerk tokens.

## Validation status

- `npm run check:bostadskarta`: clean, including generation, all placement
  modes, resident matching, layout bounds, collision rejection and free-position
  selection.
- `npx tsc --noEmit`: clean.
- Targeted ESLint for all changed Bostadskarta/Fastigheter files: clean.
- Full `npm run lint`: unchanged known baseline of 7
  `react-hooks/set-state-in-effect` errors, 0 new warnings/errors.
- Production compilation succeeds with
  `NODE_OPTIONS=--max-old-space-size=4096 npm run build`; the separate TypeScript
  check is clean.
- `git diff --check`: clean.
- `graphify update .`: run after the final editor changes.
- Web Interface Guidelines review: no new blocking findings in the editor.
- Rendered desktop/tablet/mobile, signed-in interaction and keyboard QA remain
  unverified because no controllable browser was available.

## Working-tree warning

The working tree is intentionally dirty and the feature files are mostly
untracked. User-owned changes also predate this milestone (`AGENTS.md`,
`.codex/`, docs, graphify output and the service-role migration). Do not reset,
delete or overwrite unrelated changes. Inspect `git status` before editing or
committing.

## Next session

Start with `docs/HANDOFF.md`, then perform its browser/RLS checks before adding
more editor features. Rotation, multi-select and undo/redo were deliberately not
implemented.
