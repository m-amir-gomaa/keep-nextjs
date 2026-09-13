import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes, noteLabels, labels } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const allNotes = await db.query.notes.findMany({
    where: (notes, { eq, and }) => and(eq(notes.userId, userId), eq(notes.deleted, false), eq(notes.archived, false)),
    orderBy: (notes, { desc }) => [desc(notes.pinned), desc(notes.updatedAt)],
    with: {
      noteLabels: {
        with: {
          label: true
        }
      }
    }
  });

  const formattedNotes = allNotes.map(n => ({
    ...n,
    labels: n.noteLabels.map(nl => nl.label)
  }));

  return NextResponse.json(formattedNotes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title = "", body: noteBody = "", color = "", pinned = false, labelIds = [] } = body;

  if (!title.trim() && !noteBody.trim()) {
    return NextResponse.json({ error: "Note cannot be empty" }, { status: 400 });
  }

  const result = await db.insert(notes).values({
    title: title.trim(),
    body: noteBody.trim(),
    color,
    pinned,
    userId: session.user.id,
  }).returning();

  const noteId = result[0].id;
  
  if (labelIds.length > 0) {
    await db.insert(noteLabels).values(
      labelIds.map((id: string) => ({ noteId, labelId: id }))
    );
  }

  // fetch with labels
  const finalNote = await db.query.notes.findFirst({
    where: eq(notes.id, noteId),
    with: { noteLabels: { with: { label: true } } }
  });

  const formattedNote = {
    ...finalNote,
    labels: finalNote?.noteLabels.map(nl => nl.label)
  };

  return NextResponse.json(formattedNote, { status: 201 });
}
