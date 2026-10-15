CREATE TABLE "rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"window" integer NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "recovery_hash" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;