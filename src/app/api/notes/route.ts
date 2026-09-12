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

  const allNotes = await db.select().from(notes).where(
    and(eq(notes.userId, session.user.id), eq(notes.deleted, false), eq(notes.archived, false))
  ).orderBy(desc(notes.pinned), desc(notes.updatedAt));

  return NextResponse.json(allNotes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title = "", body: noteBody = "", color = "", pinned = false } = body;

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

  return NextResponse.json(result[0], { status: 201 });
}
