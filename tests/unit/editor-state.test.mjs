import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { loader, projectRoot, projectRequire } from "../helpers/load-ts.mjs";
// Match the loader's CJS entrypoints; mixing ESM/CJS duplicates CodeMirror facet identity.
const { EditorState } = projectRequire("@codemirror/state");
const { history, undo, redo } = projectRequire("@codemirror/commands");
const { boundedNote, exactNoteLines } = loader()(
  resolve(projectRoot, "src/lib/editor-state"),
);

test("CodeMirror preserves mixed newlines and whitespace exactly", () => {
  const source = "  # Heading\r\n\r\nText  \n\tcode\rfinal ";
  const state = EditorState.create({ doc: source, extensions: exactNoteLines });
  assert.equal(state.sliceDoc(), source);
});

test("oversized paste is rejected as a whole without corrupting draft or undo", async () => {
  let limits = 0;
  const target = {
    state: EditorState.create({
      doc: "Earlier draft",
      extensions: [history(), exactNoteLines, boundedNote(() => limits++)],
    }),
  };
  target.dispatch = (tr) => {
    target.state = tr.state;
  };
  target.state = target.state.update({
    changes: { from: 13, insert: " plus text" },
  }).state;
  const before = target.state.sliceDoc();
  target.state = target.state.update({
    changes: { from: 0, insert: "x".repeat(100_001) },
  }).state;
  assert.equal(target.state.sliceDoc(), before);
  await Promise.resolve();
  assert.equal(limits, 1);
  assert.equal(undo(target), true);
  assert.equal(target.state.sliceDoc(), "Earlier draft");
  assert.equal(redo(target), true);
  assert.equal(target.state.sliceDoc(), before);
});
