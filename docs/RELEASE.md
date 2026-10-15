# Noteweld foundation release — 15 October 2026

This milestone repairs account/note/label reliability before the connected Markdown/Vim workspace. It is a free bounded preview. Paid access, editor/graph and source-bundle imports are separate future collections, not released features.

## Local evidence

- `npm test`: 27 unit/React boundary tests passed, covering auth validation, driver contracts, protected fields, pending/failed UI and idempotent draft retries. Network/auth substitutions in these tests are explicit.
- `npm run test:database`: 13 actual PostgreSQL checks passed. They cover account/seed commit and rollback, duplicate signup races, ownership, concurrent note revisions, trash constraints, idempotent creation, quotas, rate limits, rotating recovery/session versions, label races, migration collision rollback and logical snapshot restoration.
- `npm run lint`, `npm run typecheck`, isolated production build: passed. `nix eval .#devShells.x86_64-linux.default.name` evaluated the pinned Nix shell without a system rebuild.
- Chromium full cookie/database journey passed locally, including registration/recovery acknowledgment, failed-create retry, exact whitespace persistence, stale-edit recovery, checklist mutation/trash/restore, label rename identity, phone navigation, JSON export, password recovery invalidating an existing session and permanent account deletion. All 8 combined browser checks passed after the standalone build.
- Auth forms and workspace widths are checked at 320/390/768/1440; 390/1440 screenshots were visually inspected. The native note dialog focuses the title; the mobile drawer supports Escape and focus return. No authenticated journey is permanently skipped.
- Compatibility validation entrypoints import maintained project tests and pass. Private source backup precedes this work; pre-existing changes were retained.

## Isolation and deployment

A new Neon database and restricted application role were created. Migrations were applied only to that empty target and the isolated local database. The original database still has two accounts and no notes/labels; its credential files were not edited. The runtime role is verified unable to create database/schema/roles or read the original accounts.

Modal builds an explicit source allowlist on the pinned official Node image; no credential files/private artifacts are uploaded. Actual returned hostname: https://m-amir-gomaa--noteweld-web-app.us-east.modal.run. AUTH_URL is set to that exact origin. Hosted browser, health, backup encryption and actual GitHub CI results are recorded below after execution.

## Boundaries

This is not end-to-end encrypted. There is no email verification/reset service, OAuth, billing, offline sync, collaboration or production uptime guarantee. Recovery depends on the user's passphrase/private recovery key. Automated browser coverage here is Chromium, not Firefox/Safari or physical phones. Global provider hard spending caps and external alerts are not verified; owner aggregate reports and provider logs/usage are available. Code, real-database and browser evidence do not certify every possible load or failure.

## Hosted acceptance

All 8 Chromium checks passed against the actual Modal HTTPS URL, including the real account/database/recovery/deletion journey (35.5 seconds for the combined run). Health reported `status=ok`, `billing=false`; HTTPS, nonce script CSP without unsafe script inline/eval, nosniff and private no-store responses were observed. Aggregate owner reporting, daily maintenance and encrypted owner snapshot retrieval ran successfully. A new hosted synthetic account with four notes and three labels was captured, deleted from live data, then decrypted and restored into an empty isolated local clone; all fields matched after UTC timestamp interpretation. Temporary plaintext was removed. A separate restore test refuses an occupied target.

Dependency audit identified advisories in the original Next 16.3.4, sharp and source-map-js. The patched lockfile uses Next/@next/env/eslint-config-next 16.3.8, sharp 0.35.5 and source-map-js 1.2.2; `npm audit --omit=dev --json` reports zero runtime advisories on 15 October 2026. This is a point-in-time advisory check, not proof against unknown vulnerabilities. Primary advisory references: [Next ImageResponse](https://github.com/vercel/next.js/security/advisories/GHSA-vcvr-r3jv-pc5j), [Next caching](https://github.com/vercel/next.js/security/advisories/GHSA-mcj8-r9mp-w47p), [sharp](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). No vulnerable ImageResponse API was added to this app. The patched local production build, lint/types, all 27 unit/React and 13 database tests passed. All 8 local browser checks passed again (10.6 seconds), and all 8 hosted checks passed after the patch (46.8 seconds). Actual [GitHub CI run 38801749405](https://github.com/m-amir-gomaa/keep-nextjs/actions/runs/38801749405) completed successfully for `4d79e53`: install, isolated migrations, lint/types, 27 unit/React checks, 13 PostgreSQL checks, production build and real browser journey.

Canonical directory is now `freelance/noteweld`; `knowledge-workspace` and `keep-nextjs` continue through compatibility links. The move preserved Git state, branch and credential-file hashes. No NixOS rebuild, old database migration or provider payment activation occurred.

## Development dependency findings

The full (development included) audit still reports one unpatched `braces` glob-parser denial-of-service advisory propagated through Next ESLint's glob dependencies, plus the old esbuild development-server advisory propagated through drizzle-kit's nested loader. Current npm metadata offers no patched braces release; its highest release is 3.0.3. The available brace-expansion patches were applied. Automatic proposed major downgrades of eslint-config-next/drizzle-kit were not applied because they are not compatible maintenance fixes. These tools consume reviewed repository/configuration inputs, and their standalone package directories are absent from the deployed runtime. Do not expose Drizzle/esbuild development servers or run arbitrary untrusted glob configurations. This is an explicit development-tool limitation; the zero-advisory result applies only to production dependencies.

CI uses the hosted Ubuntu runner's installed Google Chrome with Chromium sandboxing enabled, matching the system-browser path used successfully on NixOS. It does not turn off user-namespace/AppArmor protection. The GitHub Playwright reporter provides actual failure annotations without uploading recovery form screenshots/traces.

The final code commit is `4d79e53`; subsequent handoff documentation does not change application code. The portfolio links the verified live preview and feature branch. Public preview remains free with billing closed.

Portfolio `5ef281e` passed [actual Pages deployment](https://github.com/m-amir-gomaa/m-amir-gomaa.github.io/actions/runs/38802130313). The public site was observed with the new title, actual preview link and correct contact, and all four Chromium widths passed. The final locked-image Modal deployment succeeded and health again reported ready/billing closed. The project-local `.venv-operations` was installed and its authenticated owner report returned zero live accounts/notes/labels after synthetic cleanup. Original Keep database isolation checks remain unchanged.
