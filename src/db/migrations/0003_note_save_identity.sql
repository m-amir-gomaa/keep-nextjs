ALTER TABLE "note" ADD COLUMN "creation_key" text;--> statement-breakpoint
ALTER TABLE "note" ADD COLUMN "creation_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX "note_owner_creation_unique" ON "note" USING btree ("user_id","creation_key");