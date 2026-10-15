import { ApiError, endpoint, readJSON } from "@/lib/api";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc, inArray } from "drizzle-orm";

export const GET = endpoint(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allNotes = await db.query.notes.findMany({
    where: and(eq(notes.userId, session.user.id), eq(notes.deleted, true)),
    orderBy: [desc(notes.updatedAt)],
    with: { noteLabels: { with: { label: true } } },
  });
  return NextResponse.json(
    allNotes.map((note) => ({
      ...note,
      labels: note.noteLabels.map((link) => link.label),
    })),
  );
});

export const DELETE = endpoint(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id)
    throw new ApiError(401, "Sign in before emptying trash.");
  const userId = session.user.id;
  const body = (await readJSON(request)) as {
    notes?: { id: string; revision: number }[];
  } | null;
  if (
    !body ||
    !Array.isArray(body.notes) ||
    body.notes.length > 1000 ||
    body.notes.some(
      (n) =>
        !n ||
        typeof n.id !== "string" ||
        n.id.length > 100 ||
        !Number.isInteger(n.revision) ||
        n.revision < 0,
    )
  )
    throw new ApiError(400, "Refresh trash before deleting notes.");
  const snapshot = body.notes;
  const ids = [...new Set(snapshot.map((n) => n.id))];
  if (ids.length !== snapshot.length)
    throw new ApiError(400, "Invalid trash selection.");
  if (!ids.length) return NextResponse.json({ success: true, deleted: 0 });
  await db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(notes)
      .where(
        and(
          eq(notes.userId, userId),
          eq(notes.deleted, true),
          inArray(notes.id, ids),
        ),
      )
      .orderBy(notes.id)
      .for("update");
    if (
      rows.length !== snapshot.length ||
      rows.some(
        (n) => snapshot.find((s) => s.id === n.id)?.revision !== n.revision,
      )
    )
      throw new ApiError(
        409,
        "Trash changed. Refresh and review it before deleting again.",
      );
    await tx
      .delete(notes)
      .where(
        and(
          eq(notes.userId, userId),
          eq(notes.deleted, true),
          inArray(notes.id, ids),
        ),
      );
  });
  return NextResponse.json({ success: true, deleted: ids.length });
});
