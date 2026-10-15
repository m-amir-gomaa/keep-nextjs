import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, labels, notes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ApiError, endpoint, readJSON } from "@/lib/api";
import { consumeRate } from "@/lib/rate-limit";

export const GET = endpoint(async () => {
  const session = await auth();
  if (!session?.user?.id)
    throw new ApiError(401, "Sign in to export your data.");
  const data = await db.transaction(
    async (tx) => {
      const [account] = await tx
        .select({ id: users.id, email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, session.user.id));
      if (!account) throw new ApiError(401, "Sign in again.");
      const owned = await tx.query.notes.findMany({
        where: eq(notes.userId, account.id),
        with: { noteLabels: true },
      });
      return {
        format: "noteweld-account",
        version: 1,
        exportedAt: new Date().toISOString(),
        account,
        labels: await tx
          .select()
          .from(labels)
          .where(eq(labels.userId, account.id)),
        notes: owned.map(
          ({ creationHash: _hash, creationKey: _key, ...note }) => {
            void _hash;
            void _key;
            return note;
          },
        ),
      };
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
  return NextResponse.json(data, {
    headers: {
      "Content-Disposition": 'attachment; filename="noteweld-account.json"',
      "Cache-Control": "private, no-store",
    },
  });
});

export const DELETE = endpoint(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id)
    throw new ApiError(401, "Sign in to delete your account.");
  const body = (await readJSON(request)) as {
    password?: unknown;
    confirmation?: unknown;
  } | null;
  if (
    !body ||
    typeof body.password !== "string" ||
    Buffer.byteLength(body.password) > 72 ||
    body.confirmation !== "DELETE"
  )
    throw new ApiError(400, "Enter your passphrase and DELETE to confirm.");
  await consumeRate("account-delete", session.user.id, 5);
  await db.transaction(async (tx) => {
    const [owner] = await tx
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .for("update");
    if (
      !owner ||
      owner.sessionVersion !== session.user.sessionVersion ||
      !(await bcrypt.compare(body.password as string, owner.password))
    )
      throw new ApiError(
        400,
        "The current passphrase was not accepted. Sign in again if you reset it.",
      );
    await tx
      .delete(users)
      .where(
        and(
          eq(users.id, owner.id),
          eq(users.sessionVersion, session.user.sessionVersion),
        ),
      );
  });
  return NextResponse.json({ deleted: true });
});
