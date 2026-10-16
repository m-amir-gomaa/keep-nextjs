import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { ApiError, endpoint } from "@/lib/api";
import { wikiReferences } from "@/lib/wiki-links";
import { consumeRate } from "@/lib/rate-limit";

export const GET = endpoint(async () => {
  const session = await auth();
  if (!session?.user?.id)
    throw new ApiError(401, "Sign in to view your connections.");
  const userId = session.user.id;
  await consumeRate("knowledge-user", userId, 30, 60);
  await consumeRate("knowledge-global", "all", 120, 60);
  const rows = await db.query.notes.findMany({
    where: and(eq(notes.userId, userId), eq(notes.deleted, false)),
    orderBy: [asc(notes.id)],
    limit: 501,
    with: { noteLabels: { with: { label: true } } },
  });
  if (rows.length > 500)
    throw new ApiError(
      413,
      "Connections currently support up to 500 notes. Your notes remain accessible from the ordinary views.",
    );
  return NextResponse.json({
    notes: rows.map((note) => {
      const parsed = note.isList
        ? { links: [], truncated: false }
        : wikiReferences(note.body);
      return {
        id: note.id,
        title: note.title,
        archived: note.archived,
        labels: note.noteLabels
          .filter((link) => link.label.userId === userId)
          .map((link) => ({ id: link.label.id, name: link.label.name })),
        references: parsed.links,
        linksTruncated: parsed.truncated,
      };
    }),
  });
});
