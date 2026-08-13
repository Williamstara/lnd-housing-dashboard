@AGENTS.md

The block above is `AGENTS.md`, included automatically — it is the shared,
vendor-neutral source of truth for this project. Follow it.

Before continuing work:

- Read `docs/SESSION.md` and `docs/HANDOFF.md`.
- Consult `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, and `docs/TODO.md`
  when relevant to the task.

Keep all shared documentation (`AGENTS.md` and everything under `docs/`)
vendor-neutral — no Claude-specific instructions belong in those files.
OpenAI Codex reads and writes the same files.

Use the `ponytail` skill for implementation, refactoring, debugging, and
review, unless explicitly told otherwise.

Before finishing a session, update `docs/SESSION.md`, `docs/HANDOFF.md`, and
the other shared docs per the workflow defined in `AGENTS.md`.

## Graphify

This project has a Graphify MCP server available.

Before exploring the codebase manually, use Graphify MCP tools to understand the relevant architecture, dependencies, and relationships.

For tasks involving multiple files, architecture, refactoring, debugging, or unfamiliar code:
1. Query Graphify first.
2. Identify the relevant nodes/files/modules.
3. Only then inspect source files directly.

Prefer Graphify over broad grep/glob searches when discovering code relationships.