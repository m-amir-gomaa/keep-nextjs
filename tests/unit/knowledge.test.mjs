import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { loader, projectRoot } from "../helpers/load-ts.mjs";
const load = loader();
const wiki = load(resolve(projectRoot, "src/lib/wiki-links"));
const knowledge = load(resolve(projectRoot, "src/lib/knowledge"));
const note = (id, title, body = "", extra = {}) => ({
  id,
  title,
  archived: false,
  labels: [],
  references: wiki.wikiReferences(body).links,
  linksTruncated: false,
  ...extra,
});

test("fit centres small graphs in phone and desktop viewports with legible margins", () => {
  const points = [
    { x: 550, y: 320 },
    { x: 710, y: 410 },
  ];
  for (const [width, height] of [
    [350, 320],
    [1080, 580],
  ]) {
    const fit = knowledge.fitGraph(points, width, height);
    assert.equal(fit.x, 630);
    assert.equal(fit.y, 365);
    const scale = (width * fit.zoom) / 1000;
    assert.ok((710 - 550) * scale < width - 100);
    assert.ok((410 - 320) * scale < height - 100);
    assert.ok(fit.zoom > 1);
  }
});

test("wiki scanning excludes code, HTML, Markdown destinations and escaped openers", () => {
  const source =
    "[[Real|caption]] **[[Bold]]**\n\n`[[inline]]`\n\n```md\n[[fenced]]\n```\n\n    [[indented]]\n\n[existing [[nested]]](https://example.test)\n\n<div>\n[[html]]\n</div>\n\n\\[[escaped]]\n\n[[Final]]";
  assert.deepEqual(
    wiki.wikiReferences(source).links.map((link) => link.target),
    ["Real", "Bold", "Final"],
  );
  assert.deepEqual(
    wiki
      .wikiReferences(
        "https://example.test/[[url-path]] www.example.test/[[another]] [[Real]]",
      )
      .links.map((link) => link.target),
    ["Real"],
  );
});
test("inserted aliases round-trip punctuation, pipes, brackets and Unicode safely", () => {
  const title = "Deutsch | [IPA] **_` (العربية) \\";
  const source = wiki.stableWikiLink({ id: "stable-id", title });
  const parsed = wiki.wikiReferences(source);
  assert.equal(parsed.links.length, 1);
  assert.equal(parsed.links[0].alias, title);
  assert.equal(parsed.links[0].target, "note:stable-id");
  assert.match(wiki.wikiMarkdown(source).markdown, /noteweld-wiki:0/);
  assert.equal(wiki.wikiReferences(wiki.stableWikiLink({ id: "a", title: "Two\nlines" })).links[0].alias, "Two lines");
});
test("malformed links stay source text; the reference bound is explicit and consistent", () => {
  assert.equal(
    wiki.wikiReferences("[[]] [[|empty]] [[multi\nline]] [[unterminated").links
      .length,
    0,
  );
  const source = "[[one]] ".repeat(257);
  const parsed = wiki.wikiMarkdown(source);
  assert.equal(parsed.links.length, 256);
  assert.equal(parsed.truncated, true);
  assert.ok(parsed.markdown.endsWith("[[one]] "));
  assert.equal(wiki.wikiReferences("[[".repeat(50_000)).links.length, 0);
});
test("stable IDs survive rename; title ambiguity, deletion and foreign IDs never guess", () => {
  const first = note("a", "Grammatik"),
    second = note("b", "Ｇｒａｍｍａｔｉｋ");
  let index = knowledge.knowledgeIndex([first, second]);
  assert.equal(knowledge.resolveWiki("grammatik", index).status, "ambiguous");
  assert.equal(knowledge.resolveWiki("note:a", index).note.id, "a");
  first.title = "Renamed";
  index = knowledge.knowledgeIndex([first]);
  assert.equal(knowledge.resolveWiki("note:a", index).note.title, "Renamed");
  assert.equal(knowledge.resolveWiki("Grammatik", index).status, "missing");
  assert.equal(
    knowledge.resolveWiki("note:someone-elses-id", index).status,
    "missing",
  );
});
test("backlink edges deduplicate mentions, exclude self/broken/ambiguous links and retain archive", () => {
  const notes = [
    note("a", "A", "[[B]] [[note:b|again]] [[A]] [[Missing]]"),
    note("b", "B", "[[A]]", { archived: true }),
  ];
  assert.deepEqual(knowledge.connectionEdges(notes), [
    { source: "a", target: "b" },
    { source: "b", target: "a" },
  ]);
  assert.equal(
    knowledge.graphSlice(notes, { archived: false }).notes.length,
    1,
  );
  assert.equal(
    knowledge.graphSlice(notes, { archived: false }).edges.length,
    0,
  );
  assert.equal(knowledge.graphSlice(notes, { focus: "a" }).notes.length, 2);
  assert.equal(knowledge.graphSlice(notes, { query: "B" }).notes[0].id, "b");
});
test("graph rendering bounds and deterministic layout remain finite at supported maximum", () => {
  const notes = Array.from({ length: 510 }, (_, i) =>
    note(
      "id-" + i,
      "Note " + i,
      Array.from(
        { length: 5 },
        (_, j) => "[[note:id-" + ((i + j + 1) % 510) + "]]",
      ).join(" "),
    ),
  );
  const graph = knowledge.graphSlice(notes, { limit: 500 });
  assert.equal(graph.notes.length, 500);
  assert.equal(graph.edges.length, 1000);
  assert.equal(graph.truncated, true);
  const positions = knowledge.layoutGraph(graph.notes, graph.edges);
  assert.deepEqual(positions, knowledge.layoutGraph(graph.notes, graph.edges));
  assert.ok(
    positions.every(
      (point) =>
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x >= 60 &&
        point.x <= 940 &&
        point.y >= 50 &&
        point.y <= 600,
    ),
  );
});
