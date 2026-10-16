# Editor accessibility review — 16 October 2026

The public scratchpad's CodeMirror scroll region was flagged by axe-core 4.13.0 as lacking focusable content. The editable textbox now has an explicit `tabindex=0` through CodeMirror's contentAttributes facet, including its read-only states. Tab still exits the editor normally. This does not add a second focus target around the editor or change data, save, account or payment behavior.

Local verification: lint/types, all 40 existing unit/UI checks, isolated production build, and the existing account-free editor browser journey passed. The journey checks real Markdown download, preview/split, guarded reset/navigation, four viewport widths, Tab exit, strict production CSP and absence of POST requests. A separate local axe WCAG A/AA/2.1 AA run returned zero violations on the public example. No database/schema change was needed or made; this patch does not claim a new run of the full authenticated PostgreSQL suite.

The existing Modal app was redeployed successfully (71.946 seconds) to the unchanged HTTPS hostname, retaining runtime secret/database/backup identity and closed billing. Hosted recheck evidence is recorded in the supporting portfolio release milestone. Chromium and automated accessibility checks do not certify physical iOS, every screen reader or every application state.
