-- ------------------------------------------------------------
-- Settings Options Tables (Tariff, Level, Group, Lead Source)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ------------------------------------------------------------

-- 1. Drop check constraints on students table to allow dynamic values
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_tariff_check;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_level_check;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_level2_check;

-- 2. Create tables for settings options
CREATE TABLE IF NOT EXISTS public.tariff_options (
  id          BIGSERIAL   PRIMARY KEY,
  name        TEXT        UNIQUE NOT NULL,
  price       NUMERIC     NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.education_levels (
  id          BIGSERIAL   PRIMARY KEY,
  name        TEXT        UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_groups (
  id          BIGSERIAL   PRIMARY KEY,
  name        TEXT        UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lead_sources (
  id          BIGSERIAL   PRIMARY KEY,
  name        TEXT        UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.tariff_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for full authenticated access
DROP POLICY IF EXISTS "tariff_options: authenticated access" ON public.tariff_options;
CREATE POLICY "tariff_options: authenticated access" ON public.tariff_options FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "education_levels: authenticated access" ON public.education_levels;
CREATE POLICY "education_levels: authenticated access" ON public.education_levels FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "student_groups: authenticated access" ON public.student_groups;
CREATE POLICY "student_groups: authenticated access" ON public.student_groups FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "lead_sources: authenticated access" ON public.lead_sources;
CREATE POLICY "lead_sources: authenticated access" ON public.lead_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Insert Seed Data
INSERT INTO public.tariff_options (name, price) VALUES
  ('STANDART', 13000000),
  ('PREMIUM', 32500000),
  ('VISA PLUS', 65000000),
  ('E-VISA (TIL SERTIFIKATISIZ)', 24000000),
  ('E-VISA (TIL SERTIFIKATLI)', 16000000),
  ('REGIONAL VISA', 24000000),
  ('ZERO RISK', 18500000)
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

INSERT INTO public.education_levels (name) VALUES
  ('BACHELOR'),
  ('COLLEGE'),
  ('LANGUAGE COURSE'),
  ('MASTER NO CERTIFICATE'),
  ('MASTERS')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.student_groups (name) VALUES
  ('2026 BAHOR'),
  ('2026 KUZ'),
  ('2027 BAHOR')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.lead_sources (name) VALUES
  ('Ali Uncle'),
  ('Cornell'),
  ('Headway'),
  ('SeoulStudy'),
  ('UP Marhamat')
ON CONFLICT (name) DO NOTHING;
