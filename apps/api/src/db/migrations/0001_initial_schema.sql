-- ============================================================
--  Migration 0001: Extensions, Indexes, Constraints, Triggers
--  This migration adds supplementary objects on top of the
--  tables already created by 0000_wild_nomad.sql.
--  Safe to re-run: uses IF NOT EXISTS everywhere.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── GIN trigram index on games.title ─────────────────────────
-- Replaces the plain btree index created by drizzle (same name
-- is fine — CREATE INDEX IF NOT EXISTS is a no-op when it exists)
DROP INDEX IF EXISTS games_title_trgm_idx;
CREATE INDEX IF NOT EXISTS games_title_trgm_idx ON games USING GIN (title gin_trgm_ops);

-- ── Check constraint: user_rating 1–10 ───────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_games_user_rating_check'
      AND conrelid = 'user_games'::regclass
  ) THEN
    ALTER TABLE user_games
      ADD CONSTRAINT user_games_user_rating_check
      CHECK (user_rating BETWEEN 1 AND 10);
  END IF;
END $$;

-- ── Check constraint: minutes > 0 ────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'play_sessions_minutes_check'
      AND conrelid = 'play_sessions'::regclass
  ) THEN
    ALTER TABLE play_sessions
      ADD CONSTRAINT play_sessions_minutes_check
      CHECK (minutes > 0);
  END IF;
END $$;

-- ── Unique index on achievements(user_game_id, platform_id) ──
CREATE UNIQUE INDEX IF NOT EXISTS achievements_user_game_platform_unique
  ON achievements (user_game_id, platform_id);

-- ── Index on token_blacklist(expires_at) for cleanup queries ──
CREATE INDEX IF NOT EXISTS token_blacklist_expires_at_idx
  ON token_blacklist (expires_at);

-- ── update_updated_at() trigger function ─────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── Attach trigger to users table ────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'users_updated_at'
      AND tgrelid = 'users'::regclass
  ) THEN
    CREATE TRIGGER users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'Migration 0001 complete'; END $$;
