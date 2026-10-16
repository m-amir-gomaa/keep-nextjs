import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { loader, projectRoot } from "../helpers/load-ts.mjs";
const { markdownUrl, markdownFilename, formatMarkdown } = loader()(
  resolve(projectRoot, "src/lib/markdown"),
);

test("note links allow explicit safe destinations, without relative app navigation or script URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "//tracker.test/x",
    "/api/account",
    "java\nscript:alert(1)",
    "file:///etc/passwd",
    "https:\\evil.test",
  ]) {
    assert.equal(markdownUrl(url), undefined, url);
  }
  for (const url of [
    "https://example.com/文法?q=one#two",
    "http://localhost:3000/",
    "mailto:someone@example.test",
    "#section",
  ]) {
    assert.equal(markdownUrl(url), url);
  }
});

test("Markdown filenames are portable and bounded while retaining non-Latin names", () => {
  assert.equal(markdownFilename(" ../Study: German? "), "Study German.md");
  assert.equal(markdownFilename("قواعد الألمانية"), "قواعد الألمانية.md");
  assert.equal(markdownFilename("CON"), "note-CON.md");
  assert.equal(markdownFilename("..."), "Untitled.md");
  assert.ok(markdownFilename("a".repeat(300)).length <= 83);
});

test("formatting preserves surrounding source and selects useful editable text", () => {
  const change = formatMarkdown("A useful thought", 2, 8, "bold");
  assert.deepEqual(change, {
    from: 2,
    to: 8,
    insert: "**useful**",
    anchor: 4,
    head: 10,
  });
  const quote = formatMarkdown(
    "before\nline one\nline two\nafter",
    10,
    21,
    "quote",
  );
  assert.equal(quote.insert, "> line one\n> line two");
  assert.equal(quote.from, 7);
  assert.equal(quote.to, 24);
  const link = formatMarkdown("label", 0, 5, "link");
  assert.equal(link.insert, "[label](https://example.com)");
  assert.equal(
    link.insert.slice(link.anchor, link.head),
    "https://example.com",
  );
});

test("code fences cannot be closed by selected backticks", () => {
  const change = formatMarkdown("```js\nexample\n```", 0, 17, "code");
  assert.ok(change.insert.startsWith("````\n"));
  assert.ok(change.insert.endsWith("\n````"));
});
