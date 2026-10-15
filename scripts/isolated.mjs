// Never falls back to the application's existing DATABASE_URL or credential files.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { testDatabaseURL } from "../tests/helpers/database.mjs";

const root = resolve(import.meta.dirname, "..");
mkdirSync(resolve(root, ".local"), { recursive: true, mode: 0o700 });
const secretFile = resolve(root, ".local/test-auth-secret");
if (!existsSync(secretFile))
  writeFileSync(secretFile, randomBytes(48).toString("base64url"), {
    mode: 0o600,
    flag: "wx",
  });
const env = {
  ...process.env,
  DATABASE_URL: testDatabaseURL(),
  AUTH_SECRET: readFileSync(secretFile, "utf8"),
  AUTH_URL: "http://localhost:3107",
  NEXT_TELEMETRY_DISABLED: "1",
  PORT: "3107",
  NOTEWELD_HOST: "127.0.0.1",
};
delete env.NEXTAUTH_URL;
delete env.NEXTAUTH_SECRET;
const action = process.argv[2];
if (action === "migrate") {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: resolve(root, "src/db/migrations"),
    });
    console.log("Isolated PostgreSQL migrations completed.");
  } finally {
    await pool.end();
  }
} else {
  const commands = {
    build: ["npm", ["run", "build"]],
    start: ["npm", ["run", "start"]],
    dev: [
      "npm",
      ["run", "dev", "--", "--hostname", "127.0.0.1", "--port", "3107"],
    ],
    database: ["node", ["tests/database/reliability.test.mjs"]],
    browser: [
      "npx",
      ["--no-install", "playwright", "test", ...process.argv.slice(3)],
    ],
  };
  if (!(action in commands))
    throw new Error("Choose migrate, build, start, dev, database or browser.");
  const [command, args] = commands[action];
  const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => child.kill(signal));
  child.on("exit", (code) => {
    process.exitCode = code ?? 1;
  });
  child.on("error", () => {
    console.error("Isolated command could not start.");
    process.exitCode = 1;
  });
}
