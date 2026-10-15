ALTER TABLE "note" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "label_owner_name_unique" ON "label" USING btree ("user_id",lower("name"));--> statement-breakpoint
CREATE INDEX "note_owner_state_idx" ON "note" USING btree ("user_id","deleted","archived");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_normalized_unique" ON "user" USING btree (lower("email"));