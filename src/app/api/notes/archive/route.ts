import { endpoint } from "@/lib/api";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";

export const GET = endpoint(async () => {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allNotes = await db.query.notes.findMany({
    where: and(
      eq(notes.userId, session.user.id),
      eq(notes.deleted, false),
      eq(notes.archived, true),
    ),
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
