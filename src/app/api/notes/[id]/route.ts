import { lockAccount, noteCapacity } from "@/lib/capacity";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes, noteLabels, labels } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, inArray, sql } from "drizzle-orm";
import {
  parseNoteInput,
  NoteInputError,
  type NoteInput,
} from "@/lib/note-input";
import { ApiError, endpoint, readJSON, sameOrigin } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };
const conflict =
  "This note changed in another tab. Your draft is still here; copy it or reload the saved version before retrying.";

export const GET = endpoint(async (_req: NextRequest, { params }: Params) => {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Sign in to view this note.");
  const userId = session.user.id;
  const { id } = await params;
  const note = await db.query.notes.findFirst({
    where: and(eq(notes.id, id), eq(notes.userId, userId)),
    with: { noteLabels: { with: { label: true } } },
  });
  if (!note) throw new ApiError(404, "Note not found.");
  return NextResponse.json({
    ...note,
    labels: note.noteLabels.map((link) => link.label),
  });
});

export const PATCH = endpoint(async (req: NextRequest, { params }: Params) => {
  const session = await auth();
  if (!session?.user?.id)
    throw new ApiError(401, "Sign in to save. Your draft is still here.");
  const userId = session.user.id;
  const { id } = await params;
  let input: NoteInput;
  try {
    input = parseNoteInput(await readJSON(req), "update");
  } catch (e) {
    if (e instanceof NoteInputError) throw new ApiError(400, e.message);
    throw e;
  }
  const { labelIds, expectedRevision, ...change } = input;
  const result = await db.transaction(async (tx) => {
    await lockAccount(tx, userId);
    const [current] = await tx
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .for("update");
    if (!current) throw new ApiError(404, "Note not found.");
    if (current.revision !== expectedRevision)
      throw new ApiError(409, conflict);
    if (
      current.deleted &&
      !(
        Object.keys(change).length === 1 &&
        change.deleted === false &&
        labelIds === undefined
      )
    ) {
      throw new ApiError(
        409,
        "Restore this note before changing its contents.",
      );
    }
    if (labelIds?.length) {
      const owned = await tx
        .select({ id: labels.id })
        .from(labels)
        .where(and(eq(labels.userId, userId), inArray(labels.id, labelIds)));
      if (owned.length !== labelIds.length)
        throw new ApiError(
          400,
          "Some selected labels are no longer available. Refresh labels and try again.",
        );
    }
    await noteCapacity(tx, userId, { title: change.title ?? current.title, body: change.body ?? current.body, listItems: change.listItems ?? current.listItems }, current.id);
    await tx
      .update(notes)
      .set({
        ...change,
        revision: sql`${notes.revision} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)));
    if (labelIds !== undefined) {
      await tx.delete(noteLabels).where(eq(noteLabels.noteId, id));
      if (labelIds.length)
        await tx
          .insert(noteLabels)
          .values(labelIds.map((labelId) => ({ noteId: id, labelId })));
    }
    return tx.query.notes.findFirst({
      where: and(eq(notes.id, id), eq(notes.userId, userId)),
      with: { noteLabels: { with: { label: true } } },
    });
  });
  return NextResponse.json({
    ...result,
    labels: result!.noteLabels.map((link) => link.label),
  });
});

export const DELETE = endpoint(async (req: NextRequest, { params }: Params) => {
  const session = await auth();
  if (!session?.user?.id)
    throw new ApiError(401, "Sign in before deleting a note.");
  const userId = session.user.id;
  sameOrigin(req);
  const expected = req.headers.get("if-match");
  if (!expected || !/^\d{1,10}$/.test(expected))
    throw new ApiError(400, "Refresh this note before deleting it.");
  const { id } = await params;
  await db.transaction(async (tx) => {
    const [note] = await tx
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .for("update");
    if (!note) throw new ApiError(404, "Note not found.");
    if (!note.deleted)
      throw new ApiError(
        409,
        "Move this note to trash before deleting it permanently.",
      );
    if (note.revision !== Number(expected)) throw new ApiError(409, conflict);
    await tx
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)));
  });
  return NextResponse.json({ success: true });
});
