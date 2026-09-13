import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, labels, notes, noteLabels } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.insert(users).values({
      email,
      password: hashedPassword,
      name,
    }).returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });

    const userId = newUser[0].id;

    const createdLabels = await db.insert(labels).values([
      { name: "Architecture", userId },
      { name: "Philosophy", userId },
      { name: "Deep Work", userId }
    ]).returning({ id: labels.id });

    const createdNotes = await db.insert(notes).values([
      { title: "Clean Architecture", body: "Dependency rules are about controlling the flow of control and data. Dependencies must point inward toward the domain model.", pinned: true, color: "", userId },
      { title: "The Pragmatic Programmer", body: "It's not just what you write, it's how you manage state over time. Don't live with broken windows.", pinned: false, color: "", userId },
      { title: "Deep Work", body: "Professional activities performed in a state of distraction-free concentration that push your cognitive capabilities to their limit.", pinned: false, color: "", userId }
    ]).returning({ id: notes.id });

    await db.insert(noteLabels).values([
      { noteId: createdNotes[0].id, labelId: createdLabels[0].id },
      { noteId: createdNotes[1].id, labelId: createdLabels[1].id },
      { noteId: createdNotes[2].id, labelId: createdLabels[2].id }
    ]);

    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
