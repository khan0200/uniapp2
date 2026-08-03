-- Reusable directory of school contact details.
--
-- Students repeatedly come from the same institutions, so the school's address,
-- website, phone and email are stored once per school and auto-filled into the
-- Educational Background form when its name is picked. Saving a student writes
-- back any edited values, so the directory self-corrects over time.
CREATE TABLE IF NOT EXISTS schools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Match key. Uppercased/normalised by the app before lookup and write.
  name        TEXT NOT NULL,
  address     TEXT,
  website     TEXT,
  phone       TEXT,
  email       TEXT,
  -- 'seed' rows come from the bundled directory, 'user' rows were typed by
  -- staff. User edits always win over seeded values.
  source      TEXT NOT NULL DEFAULT 'user',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per school name; the app upserts on this.
CREATE UNIQUE INDEX IF NOT EXISTS schools_name_key ON schools (name);

ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- The directory holds no personal data and is shared across the workspace, so
-- any signed-in user may read it and contribute corrections.
DROP POLICY IF EXISTS "schools_read" ON schools;
CREATE POLICY "schools_read" ON schools
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "schools_write" ON schools;
CREATE POLICY "schools_write" ON schools
  FOR INSERT TO authenticated WITH CHECK (TRUE);

DROP POLICY IF EXISTS "schools_update" ON schools;
CREATE POLICY "schools_update" ON schools
  FOR UPDATE TO authenticated USING (TRUE) WITH CHECK (TRUE);
