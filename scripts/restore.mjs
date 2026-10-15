// Explicit empty target only. Never reads .env or defaults to the running database.
import pg from "pg";
import { readFile } from "node:fs/promises";
import { restoreEmptyDatabase } from "./backup-format.mjs";
const [file, target] = process.argv.slice(2);
const url = new URL(process.env.NOTEWELD_RESTORE_DATABASE_URL || "");
if (!file || !target || decodeURIComponent(url.pathname.slice(1)) !== target)
  throw Error(
    "Supply a decrypted private snapshot file, explicit target name and NOTEWELD_RESTORE_DATABASE_URL.",
  );
const pool = new pg.Pool({ connectionString: url.href, max: 1 });
try {
  await restoreEmptyDatabase(pool, JSON.parse(await readFile(file, "utf8")));
  console.log("Restored the explicitly selected empty target.");
} finally {
  await pool.end();
}
