import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL must identify a configured PostgreSQL database.");
const state = globalThis as unknown as { noteweldPool?: Pool };
export const pool = state.noteweldPool ?? new Pool({
  connectionString,
  max: 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
  statement_timeout: 10_000,
  query_timeout: 15_000,
  allowExitOnIdle: true,
});
if (!state.noteweldPool) pool.on("error", () => console.error("PostgreSQL idle connection failed; subsequent requests may reconnect."));
if (process.env.NODE_ENV !== "production") state.noteweldPool = pool;
export const db = drizzle(pool, { schema });
