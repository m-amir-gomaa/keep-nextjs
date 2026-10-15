import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import {
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  copyFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { testDatabaseURL } from "../helpers/database.mjs";
test("legacy case collisions stop migration and roll back DDL without deleting accounts", async () => {
  const admin = new pg.Pool({ connectionString: testDatabaseURL() });
  const name = "noteweld_test_migration_" + randomBytes(6).toString("hex");
  let pool;
  const folder = await mkdtemp(resolve(tmpdir(), "noteweld-migrations-"));
  try {
    await admin.query('CREATE DATABASE "' + name + '"');
    const url = new URL(testDatabaseURL());
    url.pathname = "/" + name;
    pool = new pg.Pool({ connectionString: url.href });
    await mkdir(resolve(folder, "meta"));
    const source = resolve("src/db/migrations");
    const journal = JSON.parse(
      await readFile(resolve(source, "meta/_journal.json"), "utf8"),
    );
    await writeFile(
      resolve(folder, "meta/_journal.json"),
      JSON.stringify({ ...journal, entries: journal.entries.slice(0, 2) }),
    );
    for (const entry of journal.entries.slice(0, 2))
      await copyFile(
        resolve(source, entry.tag + ".sql"),
        resolve(folder, entry.tag + ".sql"),
      );
    await migrate(drizzle(pool), { migrationsFolder: folder });
    await pool.query(
      'INSERT INTO "user"(id,email,password) VALUES ($1,$2,$3),($4,$5,$6)',
      [
        "one",
        "Legacy@example.test",
        "fixture",
        "two",
        "legacy@example.test",
        "fixture",
      ],
    );
    await assert.rejects(() =>
      migrate(drizzle(pool), { migrationsFolder: source }),
    );
    assert.equal(
      (await pool.query('SELECT count(*)::int AS n FROM "user"')).rows[0].n,
      2,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT count(*)::int AS n FROM information_schema.columns WHERE table_name='note' AND column_name='revision'",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    if (pool) await pool.end();
    await admin.query('DROP DATABASE IF EXISTS "' + name + '"');
    await admin.end();
    await rm(folder, { recursive: true, force: true });
  }
});
