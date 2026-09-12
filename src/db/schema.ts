import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  password: text("password").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const notes = sqliteTable("note", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  color: text("color").notNull().default(""),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const labels = sqliteTable("label", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(strftime('%s', 'now'))`),
});

export const noteLabels = sqliteTable("note_label", {
  noteId: text("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  labelId: text("label_id").notNull().references(() => labels.id, { onDelete: "cascade" }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.noteId, table.labelId] }),
  };
});
