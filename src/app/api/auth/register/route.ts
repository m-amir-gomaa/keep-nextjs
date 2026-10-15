import { consumeRate, clientIdentity } from "@/lib/rate-limit";
import { makeRecoveryKey, recoveryHash } from "@/lib/recovery";
import { ApiError, readJSON } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, labels, notes, noteLabels } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  AuthInputError,
  isEmailConflict,
  parseRegistration,
} from "@/lib/auth-input";

export async function POST(req: NextRequest) {
  try {
    const input = await readJSON(req);
    const { email, password, name } = parseRegistration(input);
    await consumeRate("signup-ip", clientIdentity(req), 10, 3600);
    await consumeRate("signup-global", "all", 50, 86400);
    // Keep accounts created before email normalization accessible.
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 409 },
      );
    }

    const recoveryKey = makeRecoveryKey();
    const hashedPassword = await bcrypt.hash(password, 10);

    const userId = crypto.randomUUID();
    const labelIds = Array.from({ length: 3 }, () => crypto.randomUUID());
    const noteIds = Array.from({ length: 3 }, () => crypto.randomUUID());
    const newUser = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(71208001)`);
      const total = await tx.select({ total: sql<number>`count(*)::int` }).from(users);
      if (total[0].total >= 100) throw new ApiError(503, "The early preview is full. Please return later.");
      const [account] = await tx
        .insert(users)
        .values({
          id: userId,
          email,
          password: hashedPassword,
          recoveryHash: recoveryHash(recoveryKey),
          name,
        })
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
        });
      await tx.insert(labels).values([
        { id: labelIds[0], name: "Architecture", userId },
        { id: labelIds[1], name: "Philosophy", userId },
        { id: labelIds[2], name: "Deep Work", userId },
      ]);
      await tx.insert(notes).values(
        [
          {
            title: "Example — Sketch a project",
            body: "Write one concrete goal, the next action, and the source you want to keep. This is an editable starter example.",
            pinned: true,
            color: "",
            userId,
          },
          {
            title: "Example — A useful question",
            body: "What did I learn, what remains unclear, and what will I check next? These starter notes can be archived or removed.",
            pinned: false,
            color: "",
            userId,
          },
          {
            title: "Example — Protect a focus session",
            body: "Choose a small task, put the relevant material nearby, and write the outcome before starting another task.",
            pinned: false,
            color: "",
            userId,
          },
        ].map((note, index) => ({ ...note, id: noteIds[index] })),
      );
      await tx
        .insert(noteLabels)
        .values(
          noteIds.map((noteId, index) => ({
            noteId,
            labelId: labelIds[index],
          })),
        );
      return account;
    });

    return NextResponse.json({ ...newUser, recoveryKey }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof AuthInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (isEmailConflict(error)) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
