import assert from "node:assert/strict";
import { test } from "node:test";
import {
  component,
  mount,
  unmount,
  fill,
  click,
  button,
  reply,
  act,
} from "../helpers/dom.mjs";
const { TakeNote } = component("src/components/TakeNote"),
  { NoteCard } = component("src/components/NoteCard");
await test("failed composer save preserves draft and retries with one idempotency key", async () => {
  const calls = [];
  globalThis.fetch = async (url, opts = {}) => {
    if (opts.method === "POST") {
      calls.push(opts);
      return reply(
        calls.length === 1 ? { error: "Temporary failure" } : { id: "saved" },
        calls.length === 1 ? 503 : 201,
      );
    }
    return reply([]);
  };
  let refreshed = 0;
  await mount(TakeNote, { onNoteAdded: () => refreshed++ }, true);
  try {
    await click(button("Take a note..."));
    await fill(
      document.querySelector('[aria-label="Note body"]'),
      "Keep this text",
    );
    await click(button("Save note"));
    assert.match(
      document.querySelector("[role=alert]").textContent,
      /Temporary/,
    );
    assert.equal(
      document.querySelector('[aria-label="Note body"]').value,
      "Keep this text",
    );
    await click(button("Save note"));
    assert.equal(refreshed, 1);
    assert.equal(calls.length, 2);
    assert.equal(
      calls[0].headers.get
        ? calls[0].headers.get("Idempotency-Key")
        : calls[0].headers["Idempotency-Key"],
      calls[1].headers.get
        ? calls[1].headers.get("Idempotency-Key")
        : calls[1].headers["Idempotency-Key"],
    );
  } finally {
    await unmount();
  }
});
await test("trash checklist is read-only and restore supplies the reviewed revision", async () => {
  let patch;
  globalThis.fetch = async (url, opts = {}) => {
    if (opts.method === "PATCH") patch = JSON.parse(opts.body);
    return reply([]);
  };
  const note = {
    id: "note",
    title: "Tasks",
    body: "",
    color: "",
    pinned: false,
    archived: false,
    deleted: true,
    userId: "owner",
    labels: [],
    revision: 7,
    isList: true,
    listItems: JSON.stringify([{ text: "Task", isDone: false }]),
  };
  await mount(NoteCard, { note, onUpdate: () => {} }, true);
  try {
    assert.equal(document.querySelector("input[type=checkbox]").disabled, true);
    await click(button("Restore"));
    assert.deepEqual(patch, { deleted: false, expectedRevision: 7 });
    assert.equal(note.deleted, true);
  } finally {
    await unmount();
  }
});
await test("pending composer submission is deduplicated", async () => {
  let finish,
    writes = 0;
  globalThis.fetch = async (url, opts = {}) =>
    opts.method === "POST"
      ? (writes++, new Promise((r) => (finish = r)))
      : reply([]);
  await mount(TakeNote, { onNoteAdded: () => {} }, true);
  try {
    await click(button("Take a note..."));
    await fill(document.querySelector('[aria-label="Note body"]'), "Pending");
    await click(button("Save note"));
    assert.equal(button("Saving…").disabled, true);
    await act(async () => finish(reply({ id: "saved" }, 201)));
    assert.equal(writes, 1);
  } finally {
    await unmount();
  }
});
