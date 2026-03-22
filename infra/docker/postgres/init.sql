-- ============================================================
--  GAMERS HUB — PostgreSQL Init
--  Runs once on first container start
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for fast LIKE/ILIKE on game titles

-- Set timezone
SET timezone = 'UTC';

-- Log init complete
DO $$ BEGIN
  RAISE NOTICE 'Gamers Hub PostgreSQL initialized';
END $$;
