import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { labels } from "@/db/schema";
import { auth } from "@/lib/auth";
import { parseLabelName } from "@/lib/label-input";
import { eq, and } from "drizzle-orm";
import {
  ApiError,
  endpoint,
  readJSON,
  sameOrigin,
  uniqueConflict,
} from "@/lib/api";

type Params = { params: Promise<{ id: string }> };
export const PATCH = endpoint(async (req: NextRequest, { params }: Params) => {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Sign in to change labels.");
  const { id } = await params;
  const name = parseLabelName(await readJSON(req));
  if (!name) throw new ApiError(400, "Enter a label name of 1–100 characters.");
  try {
    const [result] = await db
      .update(labels)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(labels.id, id), eq(labels.userId, session.user.id)))
      .returning();
    if (!result) throw new ApiError(404, "Label not found.");
    return NextResponse.json(result);
  } catch (e) {
    if (uniqueConflict(e, "label_owner_name_unique"))
      throw new ApiError(409, "A label with that name already exists.");
    throw e;
  }
});
export const DELETE = endpoint(async (req: NextRequest, { params }: Params) => {
  const session = await auth();
  if (!session?.user?.id) throw new ApiError(401, "Sign in to delete labels.");
  sameOrigin(req);
  const { id } = await params;
  const result = await db
    .delete(labels)
    .where(and(eq(labels.id, id), eq(labels.userId, session.user.id)))
    .returning({ id: labels.id });
  if (!result.length) throw new ApiError(404, "Label not found.");
  return NextResponse.json({ success: true });
});
