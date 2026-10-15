import assert from "node:assert/strict";
import { test, after } from "node:test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { loader, projectRoot } from "../helpers/load-ts.mjs";
import { testDatabaseURL } from "../helpers/database.mjs";

process.env.AUTH_SECRET = randomUUID(); // Isolate rate-limit identities for this disposable test run.
const pool = new pg.Pool({ connectionString: testDatabaseURL(), max: 3 });
const schema = loader()(resolve(projectRoot, "src/db/schema"));
const db = drizzle(pool, { schema });
let owner;
let ownerRecovery;
const load = loader({
  "@/db": { db },
  "@/lib/auth": { auth: async () => ({ user: { id: owner } }) },
});
const registration = load(
  resolve(projectRoot, "src/app/api/auth/register/route"),
);
const noteRoutes = load(resolve(projectRoot, "src/app/api/notes/route"));
const itemRoutes = load(resolve(projectRoot, "src/app/api/notes/[id]/route"));
const labelRoutes = load(resolve(projectRoot, "src/app/api/labels/route"));
const labelItem = load(resolve(projectRoot, "src/app/api/labels/[id]/route"));
const trashRoutes = load(resolve(projectRoot, "src/app/api/notes/trash/route"));
const recoverRoute = load(
  resolve(projectRoot, "src/app/api/auth/recover/route"),
);
const rate = load(resolve(projectRoot, "src/lib/rate-limit"));
const nonce = randomUUID();
const ids = [];
const origin = process.env.AUTH_URL || "http://localhost:3000";
const request = (path, body, method = "POST") =>
  new Request(origin + path, {
    method,
    headers: { "Content-Type": "application/json", Origin: origin },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
async function register(label) {
  return registration.POST(
    request("/api/auth/register", {
      email: `${label}-${nonce}@example.test`,
      password: "a long synthetic password",
      name: "Synthetic test",
    }),
  );
}
after(async () => {
  if (ids.length)
    await pool.query('DELETE FROM "user" WHERE id=ANY($1::text[])', [ids]);
  await pool.end();
});

test("real PostgreSQL account and starter writes commit together", async () => {
  const response = await register("owner");
  assert.equal(response.status, 201);
  const user = await response.json();
  ids.push(user.id);
  owner = user.id;
  ownerRecovery = user.recoveryKey;
  assert.deepEqual(Object.keys(user).sort(), [
    "email",
    "id",
    "name",
    "recoveryKey",
  ]);
  const rows = await pool.query(
    "SELECT (SELECT count(*) FROM label WHERE user_id=$1)::int AS labels,(SELECT count(*) FROM note WHERE user_id=$1)::int AS notes",
    [owner],
  );
  assert.deepEqual(rows.rows[0], { labels: 3, notes: 3 });
});

test("racing case variants create only one real account", async () => {
  const responses = await Promise.all(
    Array.from({ length: 6 }, () => register("racing")),
  );
  assert.equal(responses.filter((r) => r.status === 201).length, 1);
  assert.equal(responses.filter((r) => r.status === 409).length, 5);
  const user = await responses.find((r) => r.status === 201).json();
  ids.push(user.id);
  const rows = await pool.query(
    'SELECT count(*)::int AS n FROM "user" WHERE lower(email)=$1',
    [`racing-${nonce}@example.test`],
  );
  assert.equal(rows.rows[0].n, 1);
});

test("a real seed failure rolls back account, labels, notes and associations", async () => {
  const suffix = nonce.replaceAll("-", "");
  const name = "noteweld_test_" + suffix;
  await pool.query(
    `CREATE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF EXISTS(SELECT 1 FROM "user" WHERE id=NEW.user_id AND email=TG_ARGV[0]) THEN RAISE EXCEPTION 'synthetic private failure'; END IF; RETURN NEW; END $$`,
  );
  await pool.query(
    `CREATE TRIGGER ${name} BEFORE INSERT ON note FOR EACH ROW EXECUTE FUNCTION ${name}('rollback-${nonce}@example.test')`,
  );
  try {
    const response = await register("rollback");
    assert.equal(response.status, 500);
    assert(!JSON.stringify(await response.json()).includes("private"));
    const rows = await pool.query(
      'SELECT count(*)::int AS n FROM "user" WHERE email=$1',
      [`rollback-${nonce}@example.test`],
    );
    assert.equal(rows.rows[0].n, 0);
  } finally {
    await pool.query(`DROP TRIGGER ${name} ON note; DROP FUNCTION ${name}()`);
  }
});

test("real note updates detect concurrent revisions and enforce the trash state", async () => {
  const response = await noteRoutes.POST(
    request("/api/notes", {
      title: "Concurrent original",
      body: "Protected draft.",
    }),
  );
  assert.equal(response.status, 201);
  const note = await response.json();
  const context = { params: Promise.resolve({ id: note.id }) };
  const replies = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      itemRoutes.PATCH(
        request(
          "/api/notes/" + note.id,
          { body: "Change " + i, expectedRevision: 0 },
          "PATCH",
        ),
        context,
      ),
    ),
  );
  assert.equal(replies.filter((r) => r.status === 200).length, 1);
  assert.equal(replies.filter((r) => r.status === 409).length, 4);
  const saved = await replies.find((r) => r.status === 200).json();
  assert.equal(saved.revision, 1);
  const activeDelete = await itemRoutes.DELETE(
    new Request(origin + "/api/notes/" + note.id, {
      method: "DELETE",
      headers: { Origin: origin, "If-Match": "1" },
    }),
    context,
  );
  assert.equal(activeDelete.status, 409);
  const trash = await itemRoutes.PATCH(
    request(
      "/api/notes/" + note.id,
      { deleted: true, expectedRevision: 1 },
      "PATCH",
    ),
    context,
  );
  assert.equal(trash.status, 200);
  const denied = await itemRoutes.PATCH(
    request(
      "/api/notes/" + note.id,
      { body: "Must not change trash", expectedRevision: 2 },
      "PATCH",
    ),
    context,
  );
  assert.equal(denied.status, 409);
  const restore = await itemRoutes.PATCH(
    request(
      "/api/notes/" + note.id,
      { deleted: false, expectedRevision: 2 },
      "PATCH",
    ),
    context,
  );
  assert.equal(restore.status, 200);
});

test("two actual accounts cannot modify or attach each other’s notes and labels", async () => {
  const firstOwner = owner;
  const response = await register("other");
  assert.equal(response.status, 201);
  const other = await response.json();
  ids.push(other.id);
  const foreign = (
    await pool.query("SELECT id FROM label WHERE user_id=$1 LIMIT 1", [
      other.id,
    ])
  ).rows[0];
  const attach = await noteRoutes.POST(
    request("/api/notes", { body: "Keep private", labelIds: [foreign.id] }),
  );
  assert.equal(attach.status, 400);
  const note = (
    await pool.query("SELECT id FROM note WHERE user_id=$1 LIMIT 1", [owner])
  ).rows[0];
  const ownedLabel = (
    await pool.query("SELECT id FROM label WHERE user_id=$1 LIMIT 1", [owner])
  ).rows[0];
  owner = other.id;
  try {
    assert.equal(
      (
        await itemRoutes.PATCH(
          request(
            "/api/notes/" + note.id,
            { body: "intrusion", expectedRevision: 0 },
            "PATCH",
          ),
          { params: Promise.resolve({ id: note.id }) },
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await labelItem.PATCH(
          request("/api/labels/" + ownedLabel.id, { name: "other" }, "PATCH"),
          { params: Promise.resolve({ id: ownedLabel.id }) },
        )
      ).status,
      404,
    );
    const notes = await (await noteRoutes.GET()).json();
    assert(notes.every((n) => n.userId === other.id));
  } finally {
    owner = firstOwner;
  }
});

test("an ambiguous create acknowledgement can retry without duplicating notes", async () => {
  const key = randomUUID();
  const make = (body) =>
    new Request("http://localhost:3000/api/notes", {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(body),
    });
  const responses = await Promise.all(
    Array.from({ length: 6 }, () =>
      noteRoutes.POST(
        make({ title: "One note only", body: "Retried original" }),
      ),
    ),
  );
  assert.equal(responses.filter((r) => r.status === 201).length, 1);
  assert.equal(responses.filter((r) => r.status === 200).length, 5);
  const values = await Promise.all(responses.map((r) => r.json()));
  assert.equal(new Set(values.map((n) => n.id)).size, 1);
  assert.equal(
    (await noteRoutes.POST(make({ title: "Different draft" }))).status,
    409,
  );
});

test("empty-trash confirmation cannot delete a note restored since its snapshot", async () => {
  const n = await (
    await noteRoutes.POST(request("/api/notes", { title: "Trash snapshot" }))
  ).json();
  const context = { params: Promise.resolve({ id: n.id }) };
  await itemRoutes.PATCH(
    request(
      "/api/notes/" + n.id,
      { deleted: true, expectedRevision: 0 },
      "PATCH",
    ),
    context,
  );
  await itemRoutes.PATCH(
    request(
      "/api/notes/" + n.id,
      { deleted: false, expectedRevision: 1 },
      "PATCH",
    ),
    context,
  );
  const response = await trashRoutes.DELETE(
    request(
      "/api/notes/trash",
      { notes: [{ id: n.id, revision: 1 }] },
      "DELETE",
    ),
  );
  assert.equal(response.status, 409);
  assert.equal(
    (await pool.query("SELECT deleted FROM note WHERE id=$1", [n.id])).rows[0]
      .deleted,
    false,
  );
});

test("note count and text quotas cannot be bypassed by concurrent new writes", async () => {
  const prefix = "quota-" + nonce + "-";
  try {
    await pool.query(
      "INSERT INTO note(id,user_id,title,body) SELECT $1||g,$2,'Capacity fixture',repeat('x',100000) FROM generate_series(1,22) g",
      [prefix, owner],
    );
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        noteRoutes.POST(request("/api/notes", { title: "Too much" })),
      ),
    );
    assert(responses.every((r) => r.status === 409));
  } finally {
    await pool.query("DELETE FROM note WHERE user_id=$1 AND id LIKE $2", [
      owner,
      prefix + "%",
    ]);
  }
});

test("the durable limiter admits only the configured concurrent burst", async () => {
  const result = await Promise.allSettled(
    Array.from({ length: 10 }, () => rate.consumeRate("test-burst", nonce, 3)),
  );
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 3);
  assert(
    result
      .filter((r) => r.status === "rejected")
      .every((r) => r.reason.status === 429),
  );
});

test("a recovery key resets once, rotates, and revokes the prior session version", async () => {
  const email = `owner-${nonce}@example.test`;
  const response = await recoverRoute.POST(
    request("/api/auth/recover", {
      email,
      recoveryKey: ownerRecovery,
      password: "a new long synthetic passphrase",
    }),
  );
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.match(result.recoveryKey, /^[a-zA-Z0-9_-]{43}$/);
  assert.notEqual(result.recoveryKey, ownerRecovery);
  const reused = await recoverRoute.POST(
    request("/api/auth/recover", {
      email,
      recoveryKey: ownerRecovery,
      password: "another long synthetic passphrase",
    }),
  );
  assert.equal(reused.status, 400);
  const record = (
    await pool.query(
      'SELECT session_version,recovery_hash FROM "user" WHERE id=$1',
      [owner],
    )
  ).rows[0];
  assert.equal(record.session_version, 1);
  assert.notEqual(record.recovery_hash, result.recoveryKey);
});

test("concurrent case-variant labels have one winner and clear duplicate errors", async () => {
  const values = ["Case " + nonce, "CASE " + nonce, "case " + nonce];
  const responses = await Promise.all(
    values.map((name) => labelRoutes.POST(request("/api/labels", { name }))),
  );
  assert.equal(responses.filter((r) => r.status === 201).length, 1);
  assert.equal(responses.filter((r) => r.status === 409).length, 2);
});
