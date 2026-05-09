-- Migration: add session_start_time to study_sessions
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- WHY:
--   The original schema only stored `studied_at` as a date (YYYY-MM-DD),
--   which was converted to T12:00:00 (noon) on save for manual sessions.
--   This means .getHours() on manual sessions returned a fabricated value
--   (~noon in UTC, shifted by the user's offset), making all peak-hour and
--   time-of-day personality analysis invalid.
--
--   `session_start_time` is the ONLY column the intelligence engine will
--   use for .getHours() calls going forward. It is:
--     - Set to the real browser start timestamp for live-timer sessions
--     - Set to a user-provided HH:MM (combined with studied_at) for manual sessions
--     - NULL for all legacy sessions (no timing data available)
--
-- SAFE: nullable column, no default, no constraint — existing rows are
-- simply NULL and will be excluded from time-based analysis.

ALTER TABLE study_sessions
  ADD COLUMN IF NOT EXISTS session_start_time TIMESTAMPTZ NULL;

-- Index speeds up future queries that filter/order by timing data presence
CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time
  ON study_sessions (user_id, session_start_time)
  WHERE session_start_time IS NOT NULL;
