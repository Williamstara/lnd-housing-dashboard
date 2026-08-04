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
