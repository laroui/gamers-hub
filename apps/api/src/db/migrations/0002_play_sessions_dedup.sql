-- ============================================================
--  Migration 0002: play_sessions deduplication constraint
--  Adds a unique constraint on (user_game_id, DATE(started_at))
--  so that one session per game per calendar day is enforced and
--  onConflictDoNothing() in bulkInsertSessions actually fires.
--  Clears duplicate rows first (keeps the highest-minute row).
--  Safe to re-run: uses IF NOT EXISTS / DO $$ guard.
-- ============================================================

-- 1. Remove duplicate rows — keep the row with the most minutes per (user_game_id, day).
DELETE FROM play_sessions
WHERE id NOT IN (
  SELECT DISTINCT ON (user_game_id, (started_at AT TIME ZONE 'UTC')::date)
    id
  FROM play_sessions
  ORDER BY
    user_game_id,
    (started_at AT TIME ZONE 'UTC')::date,
    minutes DESC,
    id
);

-- 2. Add the unique constraint (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'play_sessions_user_game_day_unique'
  ) THEN
    ALTER TABLE play_sessions
      ADD CONSTRAINT play_sessions_user_game_day_unique
      UNIQUE (user_game_id, (started_at AT TIME ZONE 'UTC')::date);
  END IF;
END $$;
