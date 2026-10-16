# Connected notes

Choose **Link note** while writing to insert a stable reference such as `[[note:UUID|Readable caption]]`. Search titles/labels, select a note and insert; the editor keeps your cursor position and undo. Escape closes the picker and returns focus. A stable ID survives a rename; its optional caption remains the text you wrote, while the link tooltip shows the current title. Copy a stable reference from any note's detail page too.

You can also type `[[Title]]` or `[[Title|caption]]`. Matching uses trimmed, case-folded NFKC titles across your own active and archived notes. Exactly one match resolves. Duplicate titles show **ambiguous**; missing titles show **unavailable**. These are name lookups, not permanent identity: use the picker for links that must survive renames or replacement by another note with the same title. Empty titles cannot be looked up by name; link them by ID. No note is created or rewritten automatically.

Wiki references must fit on one line, with at most 200 characters in each target/caption. Escape brackets, pipes or backslashes with a backslash; the picker does this. Code blocks, inline code, raw HTML and existing Markdown links/images (including GFM autolinks) are excluded. Syntax scanning is shared by the preview, metadata, backlinks and graph. The first 256 valid references in a note participate; a visible notice explains when more remain literal source. Downloads/account exports retain the full source.

## Reading and backlinks

Internal preview links open `/dashboard/note/ID`. These authenticated detail pages show full Markdown or a checklist, note controls, copyable stable references, outgoing links and saved backlinks. Archived notes still work. Trash is excluded from the connection index; a trashed reference becomes unavailable and works again after restoration. Permanent deletion never retargets a stable reference, including when another note gets the same title. Guessed IDs from another account return a generic not-found result.

In an open note, expand **Links and backlinks**. Outgoing references use the current draft, while backlinks come from saved notes. Repeated references from the same source do not create extra backlinks. Existing labels serve as tags and graph filters. They retain their current ownership, rename and deletion behavior.

Connections refresh after confirmed writes in the same workspace. Use **Refresh connections**, **Refresh graph**, or the header refresh to see other-tab changes. This is snapshot data, not live collaboration. Ordinary internal-link navigation warns before discarding an unsaved draft. A failed navigation does not clear the draft guard; a failed detail refresh retains the previous note. Header refresh also checks for unsaved work. Browser history/navigation and crash recovery are not a durable draft system: save important changes first.

## Graph

Open **Graph** in navigation. It includes active/archived notes and excludes Trash. Filter titles or labels, choose one label, include/exclude archive, or focus a note and its immediate neighbours. Filters intersect; **Reset filters** returns the whole view. **Fit graph** frames the actual visible positions, including small graphs, and adapts to viewport size. Labels/dots retain a readable screen size while zooming. Camera buttons work with keyboard or touch; mouse dragging pans the background. The HTML note list and native focus selector provide equivalent navigation without requiring SVG interaction.

There is no continuous physics loop, animation tracking or network polling. A deterministic bounded layout is computed when graph data/filters change. At most 500 nodes and 1,000 directed edges are drawn; the current free account quota is still 250 notes. The node-limit control and an explicit warning disclose truncation. A reference beyond a note's 256-reference limit is not counted as an edge/backlink; reduce or split that note to include it. Self-links remain valid but do not add graph edges or self-backlinks.

Try the same renderer without an account at [/example/graph](https://m-amir-gomaa--noteweld-web-app.us-east.modal.run/example/graph). Its six original notes are fixtures, with local anchor navigation; it reads no private API or cloud account and does not pretend to save user notes.

## Implementation and operations

`/api/knowledge` authenticates before database access, selects only the owner's non-trashed rows and returns minimal derived metadata, not note bodies, account identifiers or credentials. Label ownership is checked too. The existing no-store/nosniff/CSP boundaries remain. Parsing uses pinned MIT-licensed `mdast-util-from-markdown`, `mdast-util-gfm` and `micromark-extension-gfm`, already shared with the Markdown toolchain. No HTML execution or wider image/network policy is added.

Metadata is fetched lazily when needed and kept only in the open workspace. Versioned/abortable requests reject stale responses; confirmed writes invalidate the snapshot. The route is bounded to 500 notes, with 30 requests/minute per account and 120/minute globally. Per-account admission happens before global admission so a single throttled account cannot consume the entire global counter. Fixed-window boundary bursts and provider-wide spending controls are not universal load/abuse certification.

No schema migration, original Keep database access, payment change, new provider or always-on service is required. Rollback to the Markdown/Vim release preserves bodies and ordinary account functionality; wiki syntax becomes text there. Source-bundle imports must later map imported identities explicitly rather than reusing another account's IDs.

Primary parser references: [from-markdown](https://github.com/syntax-tree/mdast-util-from-markdown), [GFM AST extensions](https://github.com/syntax-tree/mdast-util-gfm), [GFM syntax extensions](https://github.com/micromark/micromark-extension-gfm). Installed package APIs and Next 16.3.8 client/route/lazy-loading guides were read before implementation. Current test/publication evidence belongs in [connection release](CONNECTIONS-RELEASE.md); Firefox/Safari, physical touch/IME and formal accessibility certification remain separate checks.
