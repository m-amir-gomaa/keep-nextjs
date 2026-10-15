# Noteweld foundation release — 15 October 2026

This milestone repairs account/note/label reliability before the connected Markdown/Vim workspace. It is a free bounded preview. Paid access, editor/graph and source-bundle imports are separate future collections, not released features.

## Local evidence

- `npm test`: 27 unit/React boundary tests passed, covering auth validation, driver contracts, protected fields, pending/failed UI and idempotent draft retries. Network/auth substitutions in these tests are explicit.
- `npm run test:database`: 13 actual PostgreSQL checks passed. They cover account/seed commit and rollback, duplicate signup races, ownership, concurrent note revisions, trash constraints, idempotent creation, quotas, rate limits, rotating recovery/session versions, label races, migration collision rollback and logical snapshot restoration.
- `npm run lint`, `npm run typecheck`, isolated production build: passed. `nix eval .#devShells.x86_64-linux.default.name` evaluated the pinned Nix shell without a system rebuild.
- Chromium full cookie/database journey passed locally, including registration/recovery acknowledgment, failed-create retry, exact whitespace persistence, stale-edit recovery, checklist mutation/trash/restore, label rename identity, phone navigation, JSON export, password recovery invalidating an existing session and permanent account deletion. Final combined browser result is recorded after the last build.
- Auth forms and workspace widths are checked at 320/390/768/1440; 390/1440 screenshots were visually inspected. The native note dialog focuses the title; the mobile drawer supports Escape and focus return. No authenticated journey is permanently skipped.
- Compatibility validation entrypoints import maintained project tests and pass. Private source backup precedes this work; pre-existing changes were retained.

## Isolation and deployment

A new Neon database and restricted application role were created. Migrations were applied only to that empty target and the isolated local database. The original database still has two accounts and no notes/labels; its credential files were not edited. The runtime role is verified unable to create database/schema/roles or read the original accounts.

Modal builds an explicit source allowlist on the pinned official Node image; no credential files/private artifacts are uploaded. Actual returned hostname: https://m-amir-gomaa--noteweld-web-app.us-east.modal.run. AUTH_URL is set to that exact origin. Hosted browser, health, backup encryption and actual GitHub CI results are recorded below after execution.

## Boundaries

This is not end-to-end encrypted. There is no email verification/reset service, OAuth, billing, offline sync, collaboration or production uptime guarantee. Recovery depends on the user's passphrase/private recovery key. Automated browser coverage here is Chromium, not Firefox/Safari or physical phones. Global provider hard spending caps and external alerts are not verified; owner aggregate reports and provider logs/usage are available. Code, real-database and browser evidence do not certify every possible load or failure.
