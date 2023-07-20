DO $$ BEGIN
 CREATE TYPE "provider" AS ENUM('GOOGLE', 'FACEBOOK');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "federated_identities" (
	"provider" provider,
	"providerId" varchar,
	"createdAt" timestamp DEFAULT now(),
	"user_id" integer PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS "mood_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"value" smallint,
	"timestamp" timestamp,
	"user_id" integer
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" varchar
);

CREATE INDEX IF NOT EXISTS "mood_ratings_user_id_index" ON "mood_ratings" ("user_id");
CREATE INDEX IF NOT EXISTS "users_email_index" ON "users" ("email");
DO $$ BEGIN
 ALTER TABLE "federated_identities" ADD CONSTRAINT "federated_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "mood_ratings" ADD CONSTRAINT "mood_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
