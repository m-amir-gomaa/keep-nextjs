# Markdown/Vim release — 16 October 2026

This collection follows the [reliability foundation](RELEASE.md). It adds Markdown source/preview/split, optional Vim, in-session undo/redo, find/replace, formatting, exact Markdown downloads, guarded dialog closure and a public browser-only editor example. Checklists, account recovery, private API boundaries and revision conflicts remain intact. No database schema, original Keep data, billing configuration or NixOS settings are changed.

## Evidence

Local validation passed: 33 unit/React boundary checks, 13 actual PostgreSQL checks, lint, TypeScript and the isolated production build. All 11 production Chromium checks passed, including the existing real-cookie/database/recovery journey and the new editor journeys. All three editor journeys passed again after the final mobile split-height adjustment.

Actual browser checks cover formatting/undo/redo, write/preview/split, search, Vim normal/insert/visual and `:w`, keyboard saving from the title, saved-body equality, undo retained across saves, and a fresh history after a conflicting saved-version reload. Deliberately failed create/save and expired-session responses retain drafts. A deliberately failed editor chunk falls back to a real textarea and still saves through the real API. CommonMark/GFM preview renders tables/tasks without executing raw HTML or requesting embedded trackers. Downloaded bytes match the complete source, including a virtualized 100,000-unit note after a rejected oversized paste. Public scratchpad checks observe no POST requests, exact downloads, Tab focus exit, reset/navigation warnings and the unchanged production nonce/strict-dynamic CSP.

Workspace, editing dialog, public example and supporting portfolio were checked at 320/390/768/1440 pixels. Phone/desktop screenshots were visually inspected; syntax colours and sticky phone save controls were improved from that review. All seven portfolio DOM checks passed. Portfolio UI `394b6c3` passed actual Pages deployment and public Chromium review at all four widths.

`npm audit --omit=dev --json` reports zero known runtime advisories on 16 October 2026. This is a point-in-time advisory result. The previously documented development-only braces/esbuild findings are not silently declared fixed.

## Hosted acceptance and source

Code `cbd60fe` was pushed to `feat/markdown-vim-editor`. Actual [GitHub CI run 38872939594](https://github.com/m-amir-gomaa/keep-nextjs/actions/runs/38872939594) completed successfully, including clean dependency installation, PostgreSQL service/migrations, lint/types, all 33 unit/React checks, 13 PostgreSQL checks, production build and all 11 sandboxed Chrome checks.

Modal deployment succeeded from an immutable credential-free source allowlist in 102.4 seconds. Actual returned URL remains https://m-amir-gomaa--noteweld-web-app.us-east.modal.run. The public example is [/example](https://m-amir-gomaa--noteweld-web-app.us-east.modal.run/example). All 11 checks passed against this actual HTTPS deployment (1.1 minutes), including real cookies/persistence/recovery/deletion and both intentional failure simulations. Synthetic accounts were deleted by the journeys. The existing runtime secret, restricted database role, backup key and scale-to-zero limits were preserved. No new provider account, database migration or payment activation was required.

Portfolio UI `394b6c3` links the account-free editor, private workspace and exact source branch. Actual [Pages deployment 38873434205](https://github.com/m-amir-gomaa/m-amir-gomaa.github.io/actions/runs/38873434205) passed. The public page passed Chromium review at 320/390/768/1440, including links, case study, contact and no overflow/page errors. Final owner reporting confirmed zero accounts, notes and labels after synthetic cleanup; `/api/health` returned ready with billing false. Separate Pageweft/Sonaweft `/health` endpoints also returned HTTP 200/ready with billing disabled; no processing job or payment was run there.

## Limits

Undo is in-tab history; saved revision numbers are conflict checks, not a durable revision archive. Drafts are not crash-proof. Wiki links, backlinks, graph and source-bundle imports remain future collections. Paid access remains closed. The public example never saves its scratchpad to an account. Chromium checks do not certify every browser, input method or physical device. Development-only upstream advisories from the foundation remain separately documented unless a new audit establishes a change.
