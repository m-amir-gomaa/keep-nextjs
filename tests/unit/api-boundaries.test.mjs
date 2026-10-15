import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { loader, projectRoot } from "../helpers/load-ts.mjs";
const req = (body, headers = {}, method = "POST") =>
  new Request("http://localhost:3000/api/notes", {
    method,
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
    headers: {
      Origin: "http://localhost:3000",
      "Content-Type": "application/json",
      ...headers,
    },
  });
function fixture(authenticated = true) {
  let touched = 0;
  const db = new Proxy(
    {},
    {
      get() {
        touched++;
        throw new Error("private database failure must not be exposed");
      },
    },
  );
  const load = loader({
    "@/db": { db },
    "@/lib/auth": {
      auth: async () => (authenticated ? { user: { id: "owner" } } : null),
    },
  });
  return {
    load,
    touched: () => touched,
    notes: load(resolve(projectRoot, "src/app/api/notes/route")),
    item: load(resolve(projectRoot, "src/app/api/notes/[id]/route")),
  };
}
const ctx = { params: Promise.resolve({ id: "note" }) };
await test("unauthenticated reads and writes fail before database access", async () => {
  const f = fixture(false);
  for (const response of [
    await f.notes.GET(),
    await f.notes.POST(req({ title: "x" })),
    await f.item.PATCH(req({ title: "x", expectedRevision: 0 }), ctx),
    await f.item.DELETE(req(undefined, {}, "DELETE"), ctx),
  ])
    assert.equal(response.status, 401);
  assert.equal(f.touched(), 0);
});
await test("malformed, protected and oversized note input is rejected before persistence", async () => {
  const f = fixture();
  for (const body of [
    "{",
    null,
    [],
    {},
    { title: "x", userId: "foreign" },
    { title: 2 },
    { body: "x".repeat(100001) },
  ])
    assert.equal((await f.notes.POST(req(body))).status, 400);
  assert.equal((await f.notes.POST(req("x".repeat(262145)))).status, 413);
  assert.equal(
    (
      await f.notes.POST(
        req({ title: "x" }, { Origin: "https://evil.example" }),
      )
    ).status,
    403,
  );
  assert.equal(
    (await f.notes.POST(req({ title: "x" }, { "Content-Type": "text/plain" })))
      .status,
    415,
  );
  assert.equal(f.touched(), 0);
});
await test("invalid label names are rejected before database access", async () => {
  const f = fixture();
  const route = f.load(resolve(projectRoot, "src/app/api/labels/route"));
  for (const name of [42, "", " ".repeat(4), "x".repeat(101)])
    assert.equal((await route.POST(req({ name }))).status, 400);
  assert.equal(f.touched(), 0);
});
await test("unexpected database failures return a generic service error", async () => {
  const f = fixture();
  const old = console.error;
  console.error = () => {};
  try {
    const r = await f.notes.GET();
    assert.equal(r.status, 503);
    assert(!JSON.stringify(await r.json()).includes("private"));
  } finally {
    console.error = old;
  }
});
