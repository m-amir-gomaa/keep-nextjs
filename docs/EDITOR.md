# Writing in Noteweld

Open a text note or choose **Take a note…**. Checklists keep their separate checklist editor.

- **Write**, **Preview** and **Split** change the view without discarding source or enhanced-editor undo. Split stacks vertically on narrow screens.
- **Standard** keys work by default. **Vim** enables normal/insert/visual modes, motions, selection and Vim undo. Use `i` to insert, Escape to return to normal, `v` to select and `u` to undo. Escape in Vim stays inside the note.
- **Simple text** provides a native textarea for accessibility, device compatibility or enhanced-editor loading failure. Switching to/from it starts fresh enhanced-editor undo; source is retained. Settings apply to this editing session.
- **Undo**, **Redo**, **Find** and the formatting buttons work in the enhanced editor. Find includes replacement. Tab leaves the editor instead of trapping keyboard focus.
- **Save** or Ctrl/Cmd-S writes through the normal API. Vim `:w` uses the same path. Existing notes stay open after these saves; **Save & close** also closes. Saving a new note completes its creation. Escape/backdrop closure asks before discarding an edited note; it does not silently save it.
- A failed save leaves the draft and undo available. If another tab changed the note, copy or download the draft before **Reload saved version**. Reloading is a deliberate replacement and clears the old draft's undo history. There is no durable server revision archive yet.
- **Download .md** exports the exact current body, including unsaved changes, with the title as a portable filename. It does not insert a heading or modify stored data. Account JSON export still includes all notes and labels.

## Privacy and limits

Markdown rendering, syntax and Vim run in the browser. No AI request, external font or paid processing provider is added. Preview supports CommonMark and GFM tables/task lists. Raw HTML is ignored. Only explicit HTTP(S), mail and fragment links are clickable; application-relative and script/data/file links are disabled. External links open separately without a referrer. Images display their description and an optional external link, never an automatic image request.

Source text remains in the existing note body; no database migration is needed. The enhanced editor preserves whitespace and mixed line separators by using explicit LF splitting. Its 100,000 UTF-16-unit limit matches the existing API boundary. An oversized paste is rejected whole, with a visible message, rather than silently truncated. Account-wide quotas and request limits still apply.

Drafts and undo exist only in the open tab. Save before navigating, and keep downloads/backups for important material. A tab-close warning is not crash recovery. Neither content nor editor preferences are copied into localStorage. This is not end-to-end encryption.

## Public example

`/example` uses the same editor with original demonstration text. It needs no account and sends no scratchpad to an API. Its Ctrl/Cmd-S and Vim `:w` **download** Markdown. Reset and ordinary navigation warn before discarding changed content. This is a scratchpad demonstration, not simulated cloud persistence.

## Implementation

`MarkdownEditor` owns views, fallback, status and download; `CodeEditor` owns one CodeMirror instance with replaceable key/read-only compartments. Callbacks route through the current component state; the global Vim Ex command routes through a WeakMap keyed by actual editor instance. Component cleanup destroys the view and removes its save handler. Switching views/keys retains history; a deliberate saved-version reload remounts it.

Both enhanced editing and Markdown preview load in separate client chunks. A failed editor chunk falls back to the controlled native textarea, preserving text. A failed preview chunk leaves Write available. The dependency set is pinned in the lockfile; CodeMirror, its Vim adapter, react-markdown and remark-gfm are MIT licensed. No raw-HTML plugin or weakened script CSP is used.

Primary references: [CodeMirror state/view documentation](https://codemirror.net/docs/ref/), [official Vim adapter](https://github.com/replit/codemirror-vim), [react-markdown security](https://github.com/remarkjs/react-markdown#security), [remark-gfm](https://github.com/remarkjs/remark-gfm). Installed Next 16.3.8 client/lazy-loading guides were read for this implementation.

Automated browser evidence is Chromium on Linux. Physical mobile keyboards, IME composition, screen readers and Safari/Firefox remain separate compatibility checks; the native textarea is available without pretending those devices have been certified.
