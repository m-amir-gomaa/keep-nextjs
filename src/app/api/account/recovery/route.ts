import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ApiError, endpoint, readJSON } from "@/lib/api";
import { makeRecoveryKey, recoveryHash } from "@/lib/recovery";
import { consumeRate } from "@/lib/rate-limit";

export const POST = endpoint(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id)
    throw new ApiError(401, "Sign in to replace your recovery key.");
  const body = (await readJSON(request)) as { password?: unknown } | null;
  if (
    !body ||
    typeof body.password !== "string" ||
    Buffer.byteLength(body.password) > 72
  )
    throw new ApiError(400, "Enter your current passphrase.");
  await consumeRate("key-rotation", session.user.id, 5);
  const [owner] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!owner || !(await bcrypt.compare(body.password, owner.password)))
    throw new ApiError(400, "The current passphrase was not accepted.");
  const key = makeRecoveryKey();
  const changed = await db
    .update(users)
    .set({ recoveryHash: recoveryHash(key), updatedAt: new Date() })
    .where(
      and(
        eq(users.id, owner.id),
        eq(users.sessionVersion, session.user.sessionVersion),
        eq(users.password, owner.password),
      ),
    )
    .returning({ id: users.id });
  if (!changed.length)
    throw new ApiError(
      409,
      "The account changed. Sign in again before replacing the recovery key.",
    );
  return NextResponse.json({ recoveryKey: key });
});
