import { lockAccount } from "@/lib/capacity";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { auth } from "@/lib/auth";
import { parseLabelName } from "@/lib/label-input";
import { eq, asc, sql } from "drizzle-orm";
import { ApiError, endpoint, readJSON, uniqueConflict } from "@/lib/api";

export const GET = endpoint(async () => {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Sign in to load labels.");
  return NextResponse.json(
    await db
      .select()
      .from(labels)
      .where(eq(labels.userId, session.user.id))
      .orderBy(asc(labels.name)),
  );
});

export const POST = endpoint(async (req: NextRequest) => {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Sign in to create labels.");
  const name = parseLabelName(await readJSON(req));
  if (!name) throw new ApiError(400, "Enter a label name of 1–100 characters.");
  try {
    const result = await db.transaction(async tx => {
      const userId = session.user!.id;await lockAccount(tx, userId);
      const [current] = await tx.select({ count: sql<number>`count(*)::int` }).from(labels).where(eq(labels.userId, userId));
      if (current.count >= 50) throw new ApiError(409, "The early preview allows 50 labels per account.");
      const [created] = await tx.insert(labels).values({ name, userId }).returning();return created;
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (uniqueConflict(e, "label_owner_name_unique"))
      throw new ApiError(409, "A label with that name already exists.");
    throw e;
  }
});
