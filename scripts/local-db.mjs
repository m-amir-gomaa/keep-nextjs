// Disposable local PostgreSQL only; run inside a shell providing PostgreSQL.
import {
  mkdirSync,
  existsSync,
  readFileSync,
  writeFileSync,
  chmodSync,
  openSync,
  closeSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const local = resolve(root, ".local");
const data = resolve(local, "postgres");
const socket = resolve(local, "pg-socket");
const marker = resolve(data, "NOTEWELD_TEST_INSTANCE");
const passwordPath = resolve(local, "postgres.password");
const configPath = resolve(local, "test-database.json");
const log = resolve(local, "postgres.log");
const action = process.argv[2] || "start";
const port = 55473;
if (!["start", "stop", "status"].includes(action))
  throw new Error("Use start, stop or status.");
mkdirSync(local, { recursive: true, mode: 0o700 });
chmodSync(local, 0o700);
function run(command, args, env = process.env, allowFailure = false) {
  const p = spawnSync(command, args, { env, encoding: "utf8" });
  if (p.error || (!allowFailure && p.status !== 0))
    throw new Error(
      `${command} failed; check .local/postgres.log and PostgreSQL availability.`,
    );
  return p.status;
}
if (existsSync(data) && !existsSync(marker))
  throw new Error(
    "Unmarked PostgreSQL directory preserved; choose a separate test workspace.",
  );
if (action === "start" && !existsSync(data)) {
  const password = randomBytes(32).toString("hex");
  writeFileSync(passwordPath, password, { mode: 0o600, flag: "wx" });
  run("initdb", [
    "-D",
    data,
    "--locale=C.UTF-8",
    "--encoding=UTF8",
    "--auth-local=trust",
    "--auth-host=scram-sha-256",
    "--username=noteweld_test",
    "--pwfile=" + passwordPath,
  ]);
  writeFileSync(marker, "Disposable Noteweld test database only.\n", {
    mode: 0o600,
    flag: "wx",
  });
}
if (!existsSync(marker))
  throw new Error("No owned local test instance exists.");
if (action === "status") {
  console.log(
    run("pg_ctl", ["-D", data, "status"], process.env, true) === 0
      ? "Local test PostgreSQL is running."
      : "Local test PostgreSQL is stopped.",
  );
} else if (action === "stop") {
  if (run("pg_ctl", ["-D", data, "status"], process.env, true) === 0)
    run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
  console.log("Owned local test PostgreSQL stopped.");
} else {
  mkdirSync(socket, { recursive: true, mode: 0o700 });
  const fd = openSync(log, "a", 0o600);
  closeSync(fd);
  chmodSync(log, 0o600);
  if (run("pg_ctl", ["-D", data, "status"], process.env, true) !== 0) {
    run("pg_ctl", [
      "-D",
      data,
      "-l",
      log,
      "-o",
      `-h 127.0.0.1 -p ${port} -k ${socket} -c max_connections=20 -c shared_buffers=32MB`,
      "-w",
      "start",
    ]);
  }
  const password = readFileSync(passwordPath, "utf8");
  if (!existsSync(configPath)) {
    run(
      "createdb",
      [
        "-h",
        "127.0.0.1",
        "-p",
        String(port),
        "-U",
        "noteweld_test",
        "noteweld_test",
      ],
      { ...process.env, PGPASSWORD: password },
    );
    writeFileSync(
      configPath,
      JSON.stringify({
        url: `postgresql://noteweld_test:${password}@127.0.0.1:${port}/noteweld_test`,
      }),
      { mode: 0o600, flag: "wx" },
    );
  }
  console.log(
    "Owned local test PostgreSQL ready; private configuration saved without displaying credentials.",
  );
}
