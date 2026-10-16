# Connected notes release — 16 October 2026

Milestone 005 adds stable ID wiki-link insertion, safe code-aware resolution, explicit missing/ambiguous titles, owned metadata, linked-note detail pages, outgoing/backlink panels, a bounded/filterable graph and an account-free original graph example. See [the guide](CONNECTIONS.md) for exact syntax, limits and architecture.

## Local evidence

Forty unit/React checks and 14 actual PostgreSQL checks passed, including parser escapes/code/GFM URL boundaries, rename/ambiguity/foreign-ID semantics, maximum graph bounds/layout and actual archive/trash/foreign metadata isolation. Lint, TypeScript and the isolated production build passed. All 14 production Chromium checks passed after the final graph fitting/picker refinements, including two actual accounts, stable links across rename/trash/restore/permanent deletion, no rebinding to a replacement title, ambiguous names, picker Escape/focus, dirty link navigation, graph filters/camera and simulated metadata failure/retry. The original authenticated account/recovery, editor/Vim/export and failed-editor-chunk journeys also passed. The account-free graph was verified to make no private API requests. A further public-graph-only capture passed for visual review, without registering accounts. Runtime audit is clean at this date, with previously documented dev-only findings retained separately. Graph, editor, forms and public examples fit 320/390/768/1440. Phone/desktop graph screenshots were visually inspected; fit now uses visible bounds and SVG labels/dots retain a constant screen size. Seven supporting portfolio DOM checks passed; its publication remains pending hosted acceptance.

Hosted deployment and actual source CI are pending. No publication success is implied by local tests.

## Scope and limits

The original Keep database, existing credentials, payment gates and NixOS settings are preserved. No database schema migration or additional provider is needed. Labels serve as tags. Bare hashtags, global Vim navigation, durable revisions/offline sync, source-bundle imports and collaboration are later collections. Backlinks refresh from saved snapshots; graph and per-note bounds are disclosed. No formal all-browser/device/load guarantee is claimed.
