import { cpSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
for (const [from, to] of [
  ["public", ".next/standalone/public"],
  [".next/static", ".next/standalone/.next/static"],
])
  cpSync(resolve(root, from), resolve(root, to), { recursive: true });
const child = spawn(
  process.execPath,
  [resolve(root, ".next/standalone/server.js")],
  {
    cwd: root,
    env: { ...process.env, HOSTNAME: process.env.NOTEWELD_HOST || "127.0.0.1" },
    stdio: "inherit",
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => (process.exitCode = code ?? 1));
