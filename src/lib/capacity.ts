import { and, eq, ne, sql } from "drizzle-orm";
import type { db } from "@/db";
import { notes, users } from "@/db/schema";
import { ApiError } from "@/lib/api";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function lockAccount(tx: Tx, userId: string) {
  const result = await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
  if (!result.length) throw new ApiError(401, "The account is no longer available.");
}
export async function noteCapacity(tx: Tx, userId: string, value: { title?: string; body?: string; listItems?: string | null }, exclude?: string) {
  const [current] = await tx.select({ count: sql<number>`count(*)::int`, bytes: sql<string>`coalesce(sum(octet_length(${notes.title}) + octet_length(${notes.body}) + octet_length(coalesce(${notes.listItems}, ''))),0)::text` }).from(notes).where(and(eq(notes.userId, userId), exclude ? ne(notes.id, exclude) : undefined));
  const bytes = Buffer.byteLength((value.title || "") + (value.body || "") + (value.listItems || ""));
  if (current.count >= 250 || Number(current.bytes) + bytes > 2 * 1024 * 1024) {
    throw new ApiError(409, "The early preview allows 250 notes and 2 MiB of note text per account. Remove unneeded notes from trash to free space.");
  }
}
