# Noteweld — a connected writing workspace

A private notes/checklist preview built with Next.js 16.3.4, React 19, Auth.js and PostgreSQL/Drizzle. This repository retains its original `keep-nextjs` GitHub identity. The old Vercel deployment is a historical version; it is not updated by this release.

## Implemented

- Real account/seed transactions; normalized unique email and label identities; exact passphrases, with 15-character minimum and bcrypt's 72-byte UTF-8 limit.
- Cookie authentication, hashed one-time recovery keys, key rotation, session revocation on recovery and account deletion. No email verification/reset provider is connected.
- Notes, checklists, pin/colour/archive/trash, labels and search; shared navigation updates and narrow-screen drawer.
- Explicit saves, preserved failed drafts, bounded requests, idempotent creation and revision conflicts instead of silent overwrites. Trash permits restoration or confirmed permanent deletion.
- Snapshot-based empty trash, account JSON export, confirmed passphrase-protected account deletion, no-cache private responses and nonce-based production script CSP.
- Bounded free preview: 100 accounts, 50 registrations/day, 250 notes, 50 labels and 2 MiB note text/account. PostgreSQL-backed admission limits and one scale-to-zero CPU web container.

**Not implemented:** Markdown/Vim editing, wiki links/backlinks/graph, Sonaweft/Pageweft bundle imports, paid access, reminders, offline sync, collaboration and end-to-end encryption. Those follow this reliability foundation. This is not a production SLA or a place for irreplaceable/sensitive material.

## Isolated local development

Node 24 and PostgreSQL 17 are required. `flake.lock` pins the Nix development inputs; it does not change NixOS or graphics drivers.

```sh
nix develop
npm ci
node scripts/local-db.mjs start
node scripts/isolated.mjs migrate
node scripts/isolated.mjs dev
# http://localhost:3107
```

The helper creates a private loopback-only PostgreSQL cluster in ignored `.local/`, using SCRAM for TCP and a private owner-only socket. It refuses unmarked existing database directories. Tests never fall back to the application's `.env.local` or existing hosted database. Use `node scripts/local-db.mjs stop` when finished. CI instead supplies a disposable loopback `NOTEWELD_TEST_DATABASE_URL`.

For a separate ordinary installation, copy `.env.example` into `.env.local`, fill in your **own new development database**, migrate with `npx drizzle-kit migrate`, then `npm run dev`. Never point tests at production. Missing DATABASE_URL is an error, not a dummy fallback. Hosted Neon uses the standard `pg` driver and verified TLS, not the old HTTP batch adapter.

## Verification

```sh
npm test                         # Unit and React/jsdom boundary checks
npm run lint
npm run typecheck
npm run test:database             # Real transactions, quotas, ownership, recovery, migration rollback and restore
node scripts/isolated.mjs build   # Production build, disposable DB config
npm run test:browser              # Real cookie/PostgreSQL journey + explicit failure simulations
```

Browser binaries are separate: inside `nix develop` the shell selects Chromium. Else install the pinned Playwright browser with `npx playwright install --with-deps chromium` on a supported distribution, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a tested system Chromium. Chromium's sandbox stays enabled. `NOTEWELD_BROWSER_URL` explicitly targets an existing preview; absent that variable, Playwright starts its own isolated port 3107 server and refuses to reuse an unrelated server. Synthetic accounts are deleted after the full journey. Failed tests may leave synthetic accounts in the disposable database.

Tests do not capture authentication screenshots, traces or video. Optional `NOTEWELD_SCREENSHOTS=.local/browser` captures only the authenticated note workspace at four widths. Mocked failures are labelled separately from actual database and full-session checks. See [release evidence](docs/RELEASE.md).

## Hosting and operations

`app.py` builds from an explicit source allowlist on a digest-pinned official Node image, using `npm ci`. It never uploads `.env`, `.local` or the whole workspace. Only Next's standalone runtime, static assets and owner tooling run in the cloud. `requirements-operations.txt` pins the Modal/crypto SDKs. See [operations](docs/OPERATIONS.md) for isolated roles, deployment, backup/restore and rollback.

`src/app/api/` owns runtime validation/auth boundaries. `src/components/WorkspaceContext.tsx` owns label/draft coordination; `useNotes` ignores stale requests. `src/db/migrations/` holds forward migrations, including legacy-collision protection. Existing source/working changes were preserved before this foundation was implemented; there is no automatic merge/delete of conflicting legacy accounts.
