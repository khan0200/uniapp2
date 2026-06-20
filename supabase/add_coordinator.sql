-- ------------------------------------------------------------
-- Add Coordinator column to students and create coordinators table
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ------------------------------------------------------------

-- 1. Create coordinators table
CREATE TABLE IF NOT EXISTS public.coordinators (
  id          BIGSERIAL   PRIMARY KEY,
  name        TEXT        UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for authenticated users
DROP POLICY IF EXISTS "coordinators: authenticated access" ON public.coordinators;
CREATE POLICY "coordinators: authenticated access" ON public.coordinators FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Add coordinator column to students table
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS coordinator TEXT;

-- 5. Seed initial coordinator names (optional)
INSERT INTO public.coordinators (name) VALUES
  ('Kordinator 1'),
  ('Kordinator 2')
ON CONFLICT (name) DO NOTHING;
