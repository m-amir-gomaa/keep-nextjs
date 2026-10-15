import { lockAccount, noteCapacity } from "@/lib/capacity";
import { createHash } from "node:crypto";
import { ApiError, endpoint, readJSON } from "@/lib/api";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes, noteLabels, labels } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, inArray } from "drizzle-orm";
import {
  parseNoteInput,
  NoteInputError,
  type NoteInput,
} from "@/lib/note-input";

export const GET = endpoint(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const allNotes = await db.query.notes.findMany({
    where: (notes, { eq, and }) =>
      and(
        eq(notes.userId, userId),
        eq(notes.deleted, false),
        eq(notes.archived, false),
      ),
    orderBy: (notes, { desc }) => [desc(notes.pinned), desc(notes.updatedAt)],
    with: {
      noteLabels: {
        with: {
          label: true,
        },
      },
    },
  });

  const formattedNotes = allNotes.map((n) => ({
    ...n,
    labels: n.noteLabels.map((nl) => nl.label),
  }));

  return NextResponse.json(formattedNotes);
});

export const POST = endpoint(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id)
    throw new ApiError(
      401,
      "Sign in to save your note. Your draft has not been discarded.",
    );
  const userId = session.user.id;
  let input: NoteInput;
  try {
    input = parseNoteInput(await readJSON(req), "create");
  } catch (e) {
    if (e instanceof NoteInputError) throw new ApiError(400, e.message);
    throw e;
  }
  const { labelIds = [], ...noteData } = input;
  const key = req.headers.get("idempotency-key") || crypto.randomUUID();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)
  )
    throw new ApiError(400, "Choose a valid save request identifier.");
  const fingerprint = createHash("sha256")
    .update(JSON.stringify({ ...noteData, labelIds: [...labelIds].sort() }))
    .digest("hex");
  let replay = false;
  const result = await db.transaction(async (tx) => {
    await lockAccount(tx, userId);
    const previous = await tx.query.notes.findFirst({
      where: and(eq(notes.userId, userId), eq(notes.creationKey, key)),
      with: { noteLabels: { with: { label: true } } },
    });
    if (previous) {
      if (previous.creationHash !== fingerprint)
        throw new ApiError(
          409,
          "An earlier save already completed with different content. Refresh saved notes before starting a separate note.",
        );
      replay = true;
      return previous;
    }
    await noteCapacity(tx, userId, noteData);
    if (labelIds.length) {
      const owned = await tx
        .select({ id: labels.id })
        .from(labels)
        .where(and(eq(labels.userId, userId), inArray(labels.id, labelIds)));
      if (owned.length !== labelIds.length)
        throw new ApiError(400, "Choose labels belonging to this account.");
    }
    const noteId = crypto.randomUUID();
    const inserted = await tx
      .insert(notes)
      .values({
        ...noteData,
        id: noteId,
        userId,
        creationKey: key,
        creationHash: fingerprint,
      })
      .onConflictDoNothing({ target: [notes.userId, notes.creationKey] })
      .returning({ id: notes.id });
    if (inserted.length) {
      if (labelIds.length)
        await tx
          .insert(noteLabels)
          .values(labelIds.map((labelId) => ({ noteId, labelId })));
    } else replay = true;
    const saved = await tx.query.notes.findFirst({
      where: and(eq(notes.userId, userId), eq(notes.creationKey, key)),
      with: { noteLabels: { with: { label: true } } },
    });
    if (!saved || saved.creationHash !== fingerprint)
      throw new ApiError(
        409,
        "An earlier save already completed with different content. Refresh saved notes before starting a separate note.",
      );
    return saved;
  });
  return NextResponse.json(
    { ...result, labels: result.noteLabels.map((link) => link.label) },
    { status: replay ? 200 : 201 },
  );
});
