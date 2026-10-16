# Connected notes release — 16 October 2026

Milestone 005 adds stable ID wiki-link insertion, safe code-aware resolution, explicit missing/ambiguous titles, owned metadata, linked-note detail pages, outgoing/backlink panels, a bounded/filterable graph and an account-free original graph example. See [the guide](CONNECTIONS.md) for exact syntax, limits and architecture.

## Local evidence

Forty unit/React checks and 14 actual PostgreSQL checks passed, including parser escapes/code/GFM URL boundaries, rename/ambiguity/foreign-ID semantics, maximum graph bounds/layout and actual archive/trash/foreign metadata isolation. Lint, TypeScript and the isolated production build passed. All 14 production Chromium checks passed after the final graph fitting/picker refinements, including two actual accounts, stable links across rename/trash/restore/permanent deletion, no rebinding to a replacement title, ambiguous names, picker Escape/focus, dirty link navigation, graph filters/camera and simulated metadata failure/retry. The original authenticated account/recovery, editor/Vim/export and failed-editor-chunk journeys also passed. The account-free graph was verified to make no private API requests. A further public-graph-only capture passed for visual review, without registering accounts. Runtime audit is clean at this date, with previously documented dev-only findings retained separately. Graph, editor, forms and public examples fit 320/390/768/1440. Phone/desktop graph screenshots were visually inspected; fit now uses visible bounds and SVG labels/dots retain a constant screen size. Seven supporting portfolio DOM checks passed; its publication remains pending hosted acceptance.

## Hosted acceptance and source

Application code `e1b8740` is published on `feat/connected-notes`. Actual [GitHub CI run 38877398787](https://github.com/m-amir-gomaa/keep-nextjs/actions/runs/38877398787) completed successfully: clean install, migrations, lint/types, 40 unit/React checks, 14 PostgreSQL checks, production build and all 14 real sandboxed Chrome checks.

Modal deployed successfully in 116.5 seconds from the immutable credential-free source allowlist, preserving the existing secret, restricted role, backup functions and scale-to-zero limits. Actual returned hostname remains https://m-amir-gomaa--noteweld-web-app.us-east.modal.run. All 14 checks passed against that real HTTPS deployment in 1.7 minutes. This includes actual two-account isolation, stable links across rename/archive/trash/restore/permanent deletion, no rebinding to a replacement title, picker focus, guarded dirty navigation, graph filters/camera, explicit API failure/retry, all original account/recovery and editor/export regressions. The public graph example made no private API requests.

The account-free graph is [/example/graph](https://m-amir-gomaa--noteweld-web-app.us-east.modal.run/example/graph); the private graph is `/dashboard/graph`. Portfolio UI `ca00da5` passed actual [Pages deployment 38877939413](https://github.com/m-amir-gomaa/m-amir-gomaa.github.io/actions/runs/38877939413). All seven DOM checks passed. Actual public Chromium review at 320/390/768/1440 passed, including all four Noteweld/source links, contact, case study, no overflow and no page errors. The phone card was visually reviewed; its cover remains explicitly labelled an illustration.

## Scope and limits

The original Keep database, existing credentials, payment gates and NixOS settings are preserved. No database schema migration or additional provider is needed. Labels serve as tags. Bare hashtags, global Vim navigation, durable revisions/offline sync, source-bundle imports and collaboration are later collections. Backlinks refresh from saved snapshots; graph and per-note bounds are disclosed. No formal all-browser/device/load guarantee is claimed.

Owner reporting after the hosted suite confirmed zero accounts, notes and labels after synthetic cleanup. `/api/health` returned HTTP 200, status ready and billing false. No new role, secret, database or payment activation was performed.
