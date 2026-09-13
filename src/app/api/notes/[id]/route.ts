import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes, noteLabels } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { labelIds, ...updateData } = body;

  const [note] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  if (!note || note.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await db.update(notes).set({
    ...updateData,
    updatedAt: new Date(),
  }).where(eq(notes.id, id)).returning();

  if (labelIds !== undefined) {
    await db.delete(noteLabels).where(eq(noteLabels.noteId, id));
    if (labelIds.length > 0) {
      await db.insert(noteLabels).values(
        labelIds.map((lid: string) => ({ noteId: id, labelId: lid }))
      );
    }
  }

  const finalNote = await db.query.notes.findFirst({
    where: eq(notes.id, id),
    with: { noteLabels: { with: { label: true } } }
  });

  const formattedNote = {
    ...finalNote,
    labels: finalNote?.noteLabels.map(nl => nl.label)
  };

  return NextResponse.json(formattedNote);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [note] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
  if (!note || note.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(notes).where(eq(notes.id, id));
  return NextResponse.json({ success: true });
}
