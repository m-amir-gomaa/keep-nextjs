import { NextResponse } from "next/server";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allNotes = await db.select().from(notes).where(
    and(eq(notes.userId, session.user.id), eq(notes.deleted, false), eq(notes.archived, true))
  ).orderBy(desc(notes.updatedAt));

  return NextResponse.json(allNotes);
}
