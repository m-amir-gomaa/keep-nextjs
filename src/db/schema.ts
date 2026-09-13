import { pgTable, text, timestamp, boolean, primaryKey } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  name: text("name"),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notes = pgTable("note", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  pinned: boolean("pinned").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  deleted: boolean("deleted").notNull().default(false),
  color: text("color").notNull().default(""),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const labels = pgTable("label", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const noteLabels = pgTable("note_label", {
  noteId: text("note_id").notNull().references(() => notes.id, { onDelete: "cascade" }),
  labelId: text("label_id").notNull().references(() => labels.id, { onDelete: "cascade" }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.noteId, table.labelId] }),
  };
});

export const notesRelations = relations(notes, ({ many }) => ({
  noteLabels: many(noteLabels),
}));

export const labelsRelations = relations(labels, ({ many }) => ({
  noteLabels: many(noteLabels),
}));

export const noteLabelsRelations = relations(noteLabels, ({ one }) => ({
  note: one(notes, {
    fields: [noteLabels.noteId],
    references: [notes.id],
  }),
  label: one(labels, {
    fields: [noteLabels.labelId],
    references: [labels.id],
  }),
}));
