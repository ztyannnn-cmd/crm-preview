# T001 Current source baseline

Captured: 2026-10-20T14:23:54.888858+08:00 (Asia/Shanghai). Historical checks/stage5-source-baseline.json is unchanged.

## Entry points and instructions

- Frontend Git root: `/Users/yan/codex/solbridge工作流/crm-preview`; branch `main`; HEAD `a6122e5dfe657074c1700715e206e3754a53e41f`.
- Feature pointer: `/Users/yan/codex/solbridge工作流/crm-preview/specs/001-proposal-to-order`; installed check-prerequisites returned this existing directory.
- Backend: `/Users/yan/codex/solbridge工作流/crm-backend`; git rev-parse exit 128 (not a Git repository). No repository was initialized.
- Applicable instruction: frontend AGENTS.md. No ancestor, backend or nested AGENTS.md found. Constitution, project requirements, Spec Kit setup and fixed preview workflow were read. Current T001-T003 authorization supersedes historical phase restrictions; Q1-Q3 remain confirmed.
- Read-only checklist gate: requirements 16/16; plan-review 17/17. No extensions.yml or implement hooks.

## Actual code and test layout

- Frontend: app.mjs, model.mjs, model.d.mts, index.html, preview-bootstrap.mjs, preview-fixtures.mjs, test-fixtures.mjs, design-system/. scripts/preview.py retains 127.0.0.1:8897. No frontend package.json.
- Six frontend test files: app, model, package, pm-self-managed, regional, video-v06 (*.test.mjs).
- Backend: src/app.ts, config.ts, crm.ts, prisma-crm-repository.ts, server.ts; tests/app.test.ts and crm.test.ts. Existing Prisma schema and migration: prisma/migrations/202610190001_v061_state_bridge/migration.sql. No migration executed.
- Declared runtime: Node >=24 <25; Fastify 5.12.7; Prisma 6.19.3; tsx 4.19.4; TypeScript 5.8.3. tsconfig includes src only, excluding tests. Installed versions and executed commands belong to T003.
- Default backend has health routes only and readiness 503. Business routes need injected authenticate/repository. Existing GET routes also use write transactions and increment revision; shared/auth/constraint work remains pending.
- No frontend .gitignore exists; ignore review and backend version control remain T077, outside this batch.

## Existing worktree changes

```text
M README.md
 M app.mjs
 M design-system/README.md
 M design-system/components.mjs
 M design-system/projects.css
 M design-system/tokens.css
 M index.html
 M model.mjs
 M model.test.mjs
?? .DS_Store
?? .agents/
?? .specify/
?? AGENTS.md
?? app.test.mjs
?? design-system/drawer.css
?? design-system/operator-creators.css
?? design-system/workflow.css
?? docs/
?? model.d.mts
?? package.test.mjs
?? pm-self-managed.test.mjs
?? preview-bootstrap.mjs
?? preview-fixtures.mjs
?? qa-approved-quote-draft.png
?? qa-compact-cancellation.png
?? qa-create-order-confirmation.png
?? qa/
?? regional.test.mjs
?? scripts/
?? specs/
?? test-fixtures.mjs
?? video-v06.test.mjs
```

Tracked diff summary:

```text
README.md                    |  398 +++++++++++++++-
 app.mjs                      | 1029 ++++++++++++++++++++++++++++++++++++++----
 design-system/README.md      |   12 +-
 design-system/components.mjs |    2 +-
 design-system/projects.css   |   67 ++-
 design-system/tokens.css     |    3 +-
 index.html                   |   18 +-
 model.mjs                    |  794 ++++++++++++++++++++++++++++++--
 model.test.mjs               |  148 +++++-
 9 files changed, 2294 insertions(+), 177 deletions(-)
```

No reset, clean, stash, checkout, commit, repository initialization, browser access or preview-service start/stop was performed.

## File fingerprints

44 source/test/non-private configuration files are recorded in [source-baseline.json](source-baseline.json). Against 43 historical entries: 43 identical, 0 changed, 0 missing; 1 additional files captured. Hash equality is not runtime validation.

T001: complete. Preserve this pre-batch fingerprint when checking final changes.
