-- Add Google OAuth support to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id text UNIQUE;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
