ALTER TABLE "note" ADD COLUMN "is_list" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "note" ADD COLUMN "list_items" text DEFAULT '[]';