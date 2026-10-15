import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export function testDatabaseURL() {
  const file = resolve(import.meta.dirname, "../../.local/test-database.json");
  const value =
    process.env.NOTEWELD_TEST_DATABASE_URL ||
    (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).url : "");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "Configure an isolated NOTEWELD_TEST_DATABASE_URL; production DATABASE_URL is never used.",
    );
  }
  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !/^noteweld_test(?:_[a-z0-9_]+)?$/.test(
      decodeURIComponent(url.pathname.slice(1)),
    )
  ) {
    throw new Error(
      "Database tests require loopback PostgreSQL and a dedicated noteweld_test database.",
    );
  }
  return value;
}
