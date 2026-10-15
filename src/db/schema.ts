import {
  pgTable,
  text,
  timestamp,
  boolean,
  primaryKey,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const users = pgTable(
  "user",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull().unique(),
    name: text("name"),
    password: text("password").notNull(),
    recoveryHash: text("recovery_hash"),
    sessionVersion: integer("session_version").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("user_email_normalized_unique").on(sql`lower(${table.email})`),
  ],
);

export const notes = pgTable(
  "note",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull().default(""),
    body: text("body").notNull().default(""),
    pinned: boolean("pinned").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    deleted: boolean("deleted").notNull().default(false),
    color: text("color").notNull().default(""),
    isList: boolean("is_list").notNull().default(false),
    listItems: text("list_items").default("[]"), // Validated checklist JSON; retained for existing-data compatibility.
    revision: integer("revision").notNull().default(0),
    creationKey: text("creation_key"),
    creationHash: text("creation_hash"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("note_owner_state_idx").on(
      table.userId,
      table.deleted,
      table.archived,
    ),
    uniqueIndex("note_owner_creation_unique").on(
      table.userId,
      table.creationKey,
    ),
  ],
);

export const labels = pgTable(
  "label",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    uniqueIndex("label_owner_name_unique").on(
      table.userId,
      sql`lower(${table.name})`,
    ),
  ],
);

export const noteLabels = pgTable(
  "note_label",
  {
    noteId: text("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.noteId, table.labelId] }),
    };
  },
);

export const rateLimits = pgTable("rate_limit", {
  key: text("key").primaryKey(),
  window: integer("window").notNull(),
  count: integer("count").notNull(),
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
