import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ApiError } from "@/lib/api";

export function clientIdentity(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "local-unknown"
  ).slice(0, 100);
}
export async function consumeRate(
  bucket: string,
  value: string,
  limit: number,
  seconds = 900,
) {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("Authentication configuration is required.");
  const key = createHmac("sha256", secret)
    .update(bucket + ":" + value)
    .digest("hex");
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / seconds) * seconds;
  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit (key, "window", count) VALUES (${key}, ${window}, 1)
    ON CONFLICT (key) DO UPDATE SET count = CASE WHEN rate_limit."window" = ${window} THEN rate_limit.count + 1 ELSE 1 END, "window" = ${window}
    RETURNING count
  `);
  if (result.rows[0].count > limit)
    throw new ApiError(429, "Too many attempts. Wait before trying again.");
}
