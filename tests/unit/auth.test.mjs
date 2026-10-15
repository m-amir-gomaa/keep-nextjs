import assert from "node:assert/strict";
import { test } from "node:test";
import { resolve } from "node:path";
import { loader, projectRequire, projectRoot } from "../helpers/load-ts.mjs";
import {
  AuthInputError,
  parseCredentials,
  parseRegistration,
  isEmailConflict,
} from "../../src/lib/auth-input.ts";

const { drizzle } = projectRequire("drizzle-orm/node-postgres");
const bcrypt = projectRequire("bcryptjs");
const valid = {
  email: " Person@Example.com ",
  password: " a secure password ",
  name: " Person ",
};
const request = (body) =>
  new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

function fixture({ existing = false, failure } = {}) {
  const queries = [];
  const transactions = [];
  const schema = loader()(resolve(projectRoot, "src/db/schema"));
  let transaction;
  const client = {
    async query(config, params = []) {
      const sql = typeof config === "string" ? config : config.text;
      const query = { sql, params };
      queries.push(query);
      if (sql === "begin") {
        transaction = [];
        transactions.push(transaction);
        return { rows: [] };
      }
      if (sql === "commit" || sql === "rollback") {
        transaction = null;
        return { rows: [] };
      }
      if (transaction) transaction.push(query);
      if (/select count\(/i.test(sql)) return { rows: [[0]] };
      if (sql.startsWith("select "))
        return {
          rows: existing
            ? [["existing", "PERSON@example.com", "Person", "hash", null, null]]
            : [],
        };
      if (sql.startsWith('insert into "user"')) {
        if (failure) throw failure;
        return { rows: [[params[0], params[1], params[2]]] };
      }
      return { rows: [] };
    },
  };
  const db = drizzle(client, { schema });
  const load = loader({
    "@/db": { db },
    "@/lib/rate-limit": {
      consumeRate: async () => {},
      clientIdentity: () => "fixture",
    },
  });
  return {
    queries,
    transactions,
    route: load(resolve(projectRoot, "src/app/api/auth/register/route")),
  };
}

await test("registration normalizes identity but preserves the exact password", () => {
  assert.deepEqual(parseRegistration(valid), {
    email: "person@example.com",
    password: valid.password,
    name: "Person",
  });
  assert.equal(valid.email, " Person@Example.com ");
  assert.equal(parseRegistration({ ...valid, name: "" }).name, null);
  assert.equal(
    parseRegistration({ email: valid.email, password: valid.password }).name,
    null,
  );
});

await test("wrong shapes, protected fields, oversized identity and bcrypt truncation are rejected", () => {
  for (const input of [
    null,
    [],
    "x",
    {},
    { ...valid, email: 7 },
    { ...valid, password: true },
    { ...valid, password: "short" },
    { ...valid, password: "x".repeat(73) },
    { ...valid, password: "é".repeat(37) },
    { ...valid, name: 3 },
    { ...valid, name: "x".repeat(101) },
    { ...valid, email: "x".repeat(250) + "@a.com" },
    { ...valid, email: "bad@ address.com" },
    { ...valid, userId: "victim" },
  ]) {
    assert.throws(() => parseRegistration(input), AuthInputError);
  }
  assert.equal(
    parseRegistration({ ...valid, password: "é".repeat(36) }).password.length,
    36,
  );
  // Previously created short passwords still work at sign-in.
  assert.ok(parseCredentials({ email: valid.email, password: "old" }));
  assert.equal(parseCredentials({ email: ["a@b.com"], password: "old" }), null);
});

await test("malformed registration requests do not query or write the database", async () => {
  const f = fixture();
  for (const input of [
    "{",
    "null",
    "[]",
    "{}",
    { ...valid, password: 123 },
    { ...valid, password: "short" },
  ]) {
    assert.equal((await f.route.POST(request(input))).status, 400);
  }
  assert.equal(f.queries.length, 0);
  assert.equal(f.transactions.length, 0);
});

await test("real Drizzle PostgreSQL driver sends account, labels, notes and links in one transaction", async () => {
  const f = fixture();
  const response = await f.route.POST(request(valid));
  assert.equal(response.status, 201);
  const account = await response.json();
  assert.deepEqual(Object.keys(account).sort(), [
    "email",
    "id",
    "name",
    "recoveryKey",
  ]);
  assert.equal(account.email, "person@example.com");
  assert.equal(f.transactions.length, 1);
  const batch = f.transactions[0].filter((q) =>
    q.sql.startsWith("insert into "),
  );
  assert.equal(batch.length, 4);
  for (const [index, table] of [
    "user",
    "label",
    "note",
    "note_label",
  ].entries()) {
    assert.ok(batch[index].sql.startsWith(`insert into "${table}"`));
  }
  assert.ok(batch[1].params.includes(account.id));
  assert.ok(batch[2].params.includes(account.id));
  const passwordHash = batch[0].params.find(
    (value) => typeof value === "string" && value.startsWith("$2"),
  );
  assert.ok(await bcrypt.compare(valid.password, passwordHash));
  for (const linkedId of batch[3].params) {
    assert.ok(
      batch[1].params.includes(linkedId) || batch[2].params.includes(linkedId),
    );
  }
  assert.ok(f.queries[0].sql.includes("lower("));
  assert.ok(f.queries[0].params.includes("person@example.com"));
});

await test("existing email and concurrent unique-email conflicts return 409", async () => {
  const existing = fixture({ existing: true });
  assert.equal((await existing.route.POST(request(valid))).status, 409);
  assert.equal(existing.transactions.length, 0);
  const racing = fixture({
    failure: new Error("query failed", {
      cause: { code: "23505", constraint: "user_email_unique" },
    }),
  });
  assert.equal((await racing.route.POST(request(valid))).status, 409);
  assert.equal(racing.transactions.length, 1);
});

await test("transaction failures expose no database details or false success", async () => {
  const f = fixture({ failure: new Error("private database details") });
  const response = await f.route.POST(request(valid));
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Internal Server Error" });
  assert.equal(
    isEmailConflict({ code: "23505", constraint: "note_pkey" }),
    false,
  );
  const cyclic = {};
  cyclic.cause = cyclic;
  assert.equal(isEmailConflict(cyclic), false);
});

await test("credentials authorization validates before database access and never exposes the hash", async () => {
  let config;
  const queries = [];
  const password = "old";
  const hash = await bcrypt.hash(password, 4);
  const db = {
    select: () => ({
      from: () => ({
        where: (condition) => ({
          limit: async () => {
            queries.push(condition);
            return [
              {
                id: "owner",
                email: "Legacy@Example.com",
                name: "Legacy",
                password: hash,
              },
            ];
          },
        }),
      }),
    }),
  };
  loader({
    "@/db": { db },
    "@/lib/rate-limit": {
      consumeRate: async () => {},
      clientIdentity: () => "fixture",
    },
    "next-auth": Object.assign(
      (options) => {
        config = options;
        return {};
      },
      { CredentialsSignin: class extends Error {} },
    ),
    "next-auth/providers/credentials": (options) => options,
  })(resolve(projectRoot, "src/lib/auth"));
  const authorize = config.providers[0].authorize;
  for (const input of [
    null,
    {},
    { email: 123, password },
    { email: "x@y.com", password: [] },
    { email: "x@y.com", password: "é".repeat(37) },
  ])
    assert.equal(await authorize(input), null);
  assert.equal(queries.length, 0);
  assert.deepEqual(
    await authorize({ email: " LEGACY@example.com ", password }),
    {
      id: "owner",
      email: "Legacy@Example.com",
      name: "Legacy",
      sessionVersion: 0,
    },
  );
  assert.equal(
    await authorize({ email: "legacy@example.com", password: "wrong" }),
    null,
  );
});
