CREATE TABLE IF NOT EXISTS "mood_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" smallint,
	"timestamp" timestamp,
	"user_id" integer
);

CREATE INDEX IF NOT EXISTS "mood_ratings_user_id_index" ON "mood_ratings" ("user_id");
DO $$ BEGIN
 ALTER TABLE "mood_ratings" ADD CONSTRAINT "mood_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
