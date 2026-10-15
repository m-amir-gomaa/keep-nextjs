import assert from "node:assert/strict";
import { test } from "node:test";
import {
  noteMatchesQuery,
  parseListItems,
} from "../../src/lib/note-content.ts";
const note = {
  title: "Work",
  body: "Meeting notes",
  labels: [{ name: "Client" }],
  listItems: '[{"text":"Review API","isDone":false}]',
};
test("search includes checklist text and labels, case-insensitively", () => {
  for (const query of ["review api", " CLIENT ", "meeting", "WORK", ""])
    assert.equal(noteMatchesQuery(note, query), true);
  assert.equal(noteMatchesQuery(note, "unrelated"), false);
});
test("malformed legacy checklist data does not crash search", () => {
  for (const value of [null, "[", {}, undefined])
    assert.deepEqual(parseListItems(value), []);
  assert.deepEqual(
    parseListItems([
      { text: "valid", isDone: true },
      { text: "bad", isDone: "true" },
    ]),
    [{ text: "valid", isDone: true }],
  );
});
test("checklist decoding produces independent items", () => {
  const source = [{ text: "Task", isDone: false }];
  const result = parseListItems(source);
  result[0].isDone = true;
  assert.equal(source[0].isDone, false);
});
