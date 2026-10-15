import assert from "node:assert/strict";
import { test } from "node:test";
import { parseNoteInput, NoteInputError } from "../../src/lib/note-input.ts";

test("clients cannot replace ownership, identifiers, or timestamps", () => {
  for (const field of ["userId", "id", "createdAt", "updatedAt", "__proto__"]) {
    for (const mode of ["create", "update"]) {
      assert.throws(
        () =>
          parseNoteInput(
            JSON.parse(`{"title":"note","${field}":"other"}`),
            mode,
          ),
        NoteInputError,
      );
    }
  }
});

test("rejects wrong types and malformed checklist JSON", () => {
  for (const input of [
    null,
    [],
    "note",
    { title: 12 },
    { body: null },
    { pinned: "false" },
    { archived: 1 },
    { labelIds: "id" },
    { labelIds: [null] },
    { listItems: "[" },
    { listItems: "{}" },
    { listItems: [{ text: "x", isDone: "no" }] },
  ]) {
    assert.throws(() => parseNoteInput(input, "update"), NoteInputError);
  }
});

test("empty text and blank checklist items cannot create a note", () => {
  for (const input of [
    {},
    { title: " ", body: "\n" },
    { isList: true, listItems: [{ text: " ", isDone: false }] },
  ]) {
    assert.throws(() => parseNoteInput(input, "create"), NoteInputError);
  }
});

test("accepts both checklist formats and removes extra item fields", () => {
  const items = [{ text: " task ", isDone: true, extra: "ignored" }];
  for (const listItems of [items, JSON.stringify(items)]) {
    assert.deepEqual(parseNoteInput({ isList: true, listItems }, "create"), {
      isList: true,
      listItems: '[{"text":"task","isDone":true}]',
    });
  }
});

test("partial updates preserve explicit false, empty text, and cleared labels", () => {
  assert.deepEqual(
    parseNoteInput(
      { pinned: false, title: "", labelIds: [], expectedRevision: 0 },
      "update",
    ),
    { title: "", pinned: false, labelIds: [], expectedRevision: 0 },
  );
  assert.throws(() => parseNoteInput({}, "update"), NoteInputError);
});

test("normalizes text and deduplicates labels without mutating input", () => {
  const input = { title: " title ", labelIds: ["a", "a", "b"] };
  assert.deepEqual(parseNoteInput(input, "create"), {
    title: "title",
    labelIds: ["a", "b"],
  });
  assert.equal(input.title, " title ");
  assert.deepEqual(input.labelIds, ["a", "a", "b"]);
});

test("updates require bounded revisions and notes reject excessive input", () => {
  for (const expectedRevision of [undefined, -1, true, "0", 1.5, 1_000_000_001])
    assert.throws(
      () => parseNoteInput({ body: "draft", expectedRevision }, "update"),
      NoteInputError,
    );
  assert.throws(
    () => parseNoteInput({ expectedRevision: 0 }, "update"),
    NoteInputError,
  );
  assert.throws(
    () => parseNoteInput({ body: "x".repeat(100_001) }, "create"),
    NoteInputError,
  );
  assert.throws(
    () => parseNoteInput({ title: "x".repeat(201) }, "create"),
    NoteInputError,
  );
});
