-- Migration 0004: Add columns present in schema.ts but missing from 0000 migration
-- Safe to re-run: uses IF NOT EXISTS / column existence checks

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS screenshot_urls TEXT[] DEFAULT '{}' NOT NULL;

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}' NOT NULL;

ALTER TABLE achievements
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}' NOT NULL;
