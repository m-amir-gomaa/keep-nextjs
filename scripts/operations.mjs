// Owner-only process. Never expose this script through a public HTTP route.
import pg from "pg";
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
});
try {
  const action = process.argv[2];
  if (action === "report") {
    const result = await pool.query(
      'SELECT (SELECT count(*)::int FROM "user") AS accounts,(SELECT count(*)::int FROM note) AS notes,(SELECT count(*)::int FROM label) AS labels,(SELECT count(*)::int FROM rate_limit) AS rate_counters',
    );
    console.log(JSON.stringify(result.rows[0]));
  } else if (action === "cleanup") {
    const result = await pool.query(
      'DELETE FROM rate_limit WHERE "window" < $1',
      [Math.floor(Date.now() / 1000) - 172800],
    );
    console.log(JSON.stringify({ removedCounters: result.rowCount }));
  } else if (action === "snapshot") {
    const client = await pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const tables = {};
      for (const name of ["user", "note", "label", "note_label"])
        tables[name] = (
          await client.query('SELECT * FROM "' + name + '"')
        ).rows;
      await client.query("COMMIT");
      console.log(
        JSON.stringify({
          format: "noteweld-backup",
          version: 1,
          created: new Date().toISOString(),
          tables,
        }),
      );
    } finally {
      client.release();
    }
  } else throw Error("Unknown owner operation");
} catch {
  console.error(
    "Owner operation failed. Check configuration and database access privately.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
