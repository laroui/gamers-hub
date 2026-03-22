CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_game_id" uuid NOT NULL,
	"platform_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon_url" text,
	"earned_at" timestamp with time zone,
	"rarity_pct" real,
	"points" integer
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"igdb_id" integer,
	"steam_app_id" integer,
	"title" text NOT NULL,
	"cover_url" text,
	"background_url" text,
	"genres" text[] DEFAULT '{}' NOT NULL,
	"platforms" text[] DEFAULT '{}' NOT NULL,
	"release_year" integer,
	"metacritic" integer,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_igdb_id_unique" UNIQUE("igdb_id"),
	CONSTRAINT "games_steam_app_id_unique" UNIQUE("steam_app_id")
);
--> statement-breakpoint
CREATE TABLE "platform_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"platform_uid" text,
	"display_name" text,
	"last_synced_at" timestamp with time zone,
	"sync_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_game_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"minutes" integer NOT NULL,
	"platform" text NOT NULL,
	"device" text
);
--> statement-breakpoint
CREATE TABLE "token_blacklist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "token_blacklist_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "user_games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"game_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"platform_game_id" text NOT NULL,
	"status" text DEFAULT 'library' NOT NULL,
	"minutes_played" integer DEFAULT 0 NOT NULL,
	"last_played_at" timestamp with time zone,
	"completion_pct" real DEFAULT 0 NOT NULL,
	"achievements_earned" integer DEFAULT 0 NOT NULL,
	"achievements_total" integer DEFAULT 0 NOT NULL,
	"user_rating" integer,
	"user_notes" text,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_user_game_id_user_games_id_fk" FOREIGN KEY ("user_game_id") REFERENCES "public"."user_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_connections" ADD CONSTRAINT "platform_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_user_game_id_user_games_id_fk" FOREIGN KEY ("user_game_id") REFERENCES "public"."user_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievements_user_game_id_idx" ON "achievements" USING btree ("user_game_id");--> statement-breakpoint
CREATE INDEX "games_title_trgm_idx" ON "games" USING btree ("title");--> statement-breakpoint
CREATE UNIQUE INDEX "user_platform_unique" ON "platform_connections" USING btree ("user_id","platform");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "play_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_started_at_idx" ON "play_sessions" USING btree ("started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_platform_game_unique" ON "user_games" USING btree ("user_id","platform","platform_game_id");--> statement-breakpoint
CREATE INDEX "user_games_user_id_idx" ON "user_games" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_games_last_played_idx" ON "user_games" USING btree ("last_played_at");