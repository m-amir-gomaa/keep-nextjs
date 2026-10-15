import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ApiError, endpoint, readJSON } from "@/lib/api";
import { parseCredentials, parseRegistration, AuthInputError } from "@/lib/auth-input";
import { consumeRate, clientIdentity } from "@/lib/rate-limit";
import { validRecoveryKey, makeRecoveryKey, recoveryHash } from "@/lib/recovery";

export const POST = endpoint(async (request: Request) => {
  const body = await readJSON(request) as Record<string, unknown> | null;
  await consumeRate("recovery-ip", clientIdentity(request), 10);
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(k => !["email", "recoveryKey", "password"].includes(k))) throw new ApiError(400, "Enter your email, recovery key and a new passphrase.");
  const identity = parseCredentials({ email: body.email, password: body.password });
  if (!identity || !validRecoveryKey(body.recoveryKey)) throw new ApiError(400, "The recovery details were not accepted.");
  try { parseRegistration(identity); } catch (e) { if (e instanceof AuthInputError) throw new ApiError(400, e.message);throw e; }
  await consumeRate("recovery-email", identity.email, 5);
  const oldHash = recoveryHash(body.recoveryKey);
  const [known] = await db.select({ id: users.id }).from(users).where(and(eq(sql`lower(${users.email})`, identity.email), eq(users.recoveryHash, oldHash))).limit(1);
  if (!known) throw new ApiError(400, "The recovery details were not accepted.");
  const password = await bcrypt.hash(identity.password, 10);const key = makeRecoveryKey();
  const result = await db.update(users).set({ password, recoveryHash: recoveryHash(key), sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() }).where(and(eq(users.id, known.id), eq(users.recoveryHash, oldHash))).returning({ id: users.id });
  if (!result.length) throw new ApiError(400, "The recovery details were not accepted.");
  return NextResponse.json({ recoveryKey: key, notice: "Passphrase changed. Existing sessions and the old recovery key no longer work. Save this replacement key before signing in." });
});
