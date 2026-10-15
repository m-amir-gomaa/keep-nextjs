import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { testDatabaseURL } from "../helpers/database.mjs";
import { restoreEmptyDatabase } from "../../scripts/backup-format.mjs";
test("logical snapshot restores into an empty clone and refuses to overwrite it", async () => {
  const source = testDatabaseURL();
  const result = spawnSync(
    process.execPath,
    ["scripts/operations.mjs", "snapshot"],
    {
      env: { ...process.env, DATABASE_URL: source },
      encoding: "utf8",
      maxBuffer: 250 * 1024 * 1024,
    },
  );
  assert.equal(result.status, 0);
  const snapshot = JSON.parse(result.stdout);
  const admin = new pg.Pool({ connectionString: source });
  const name = "noteweld_test_backup_" + randomBytes(6).toString("hex");
  let target;
  try {
    await admin.query('CREATE DATABASE "' + name + '"');
    const url = new URL(source);
    url.pathname = "/" + name;
    target = new pg.Pool({ connectionString: url.href });
    await migrate(drizzle(target), { migrationsFolder: "src/db/migrations" });
    await restoreEmptyDatabase(target, snapshot);
    for (const table of ["user", "note", "label", "note_label"])
      assert.equal(
        (await target.query('SELECT count(*)::int AS n FROM "' + table + '"'))
          .rows[0].n,
        snapshot.tables[table].length,
      );
    if (snapshot.tables.user.length)
      await assert.rejects(
        () => restoreEmptyDatabase(target, snapshot),
        /must be empty/,
      );
    const sample = snapshot.tables.note[0];
    if (sample)
      assert.equal(
        (await target.query("SELECT body FROM note WHERE id=$1", [sample.id]))
          .rows[0].body,
        sample.body,
      );
  } finally {
    if (target) await target.end();
    await admin.query('DROP DATABASE IF EXISTS "' + name + '"');
    await admin.end();
  }
});
