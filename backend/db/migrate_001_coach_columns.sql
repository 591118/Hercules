-- Kjør denne hvis du allerede har kjørt init.sql uten coach-kolonner:
-- psql -U hercules -d hercules -f migrate_001_coach_columns.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_sokt BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_godkjent BOOLEAN NOT NULL DEFAULT FALSE;
