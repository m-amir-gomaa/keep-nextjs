import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allLabels = await db.select().from(labels).where(eq(labels.userId, session.user.id));
  return NextResponse.json(allLabels);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const [existing] = await db.select().from(labels).where(
    and(eq(labels.name, name.trim()), eq(labels.userId, session.user.id))
  ).limit(1);

  if (existing) {
    return NextResponse.json({ error: "Label already exists" }, { status: 409 });
  }

  const result = await db.insert(labels).values({
    name: name.trim(),
    userId: session.user.id,
  }).returning();

  return NextResponse.json(result[0], { status: 201 });
}
