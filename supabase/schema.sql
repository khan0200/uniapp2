-- ============================================================
--  EduCRM — Supabase Database Schema
--  Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- --------------------------
-- 1. Role Enum
-- --------------------------
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('Manager', 'Admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- --------------------------
-- 2. Profiles Table
--    Extends auth.users with CRM-specific fields.
--    Automatically populated via trigger on signup.
-- --------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT        UNIQUE NOT NULL,
  role        public.user_role NOT NULL DEFAULT 'Admin',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------
-- 3. Row Level Security
-- --------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check user role without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT role FROM public.profiles
    WHERE id = user_id
  );
END;
$$;

-- Users can read their own profile
DROP POLICY IF EXISTS "profiles: self select" ON public.profiles;
CREATE POLICY "profiles: self select"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Managers can read ALL profiles
DROP POLICY IF EXISTS "profiles: manager full select" ON public.profiles;
CREATE POLICY "profiles: manager full select"
  ON public.profiles
  FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'Manager');

-- Users can update their own profile (except role)
DROP POLICY IF EXISTS "profiles: self update" ON public.profiles;
CREATE POLICY "profiles: self update"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Managers can update any profile (including role assignment)
DROP POLICY IF EXISTS "profiles: manager full update" ON public.profiles;
CREATE POLICY "profiles: manager full update"
  ON public.profiles
  FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'Manager');

-- --------------------------
-- 4. Auto-update updated_at
-- --------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------
-- 5. Auto-create Profile on Signup
--    Reads full_name from user metadata if provided.
-- --------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --------------------------
-- 6. Indexes
-- --------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================
-- 7. Students Table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.students (
  -- 1. Personal & Contact Information
  id                     TEXT        PRIMARY KEY CHECK (id = UPPER(id)),
  full_name              TEXT        NOT NULL CHECK (full_name = UPPER(full_name)),
  passport               TEXT        CHECK (passport = UPPER(passport)),
  passport_issue_date    TEXT,
  passport_expire_date   TEXT,
  gender                 TEXT        CHECK (gender IN ('MALE', 'FEMALE')),
  birthday               TEXT        CHECK (birthday IS NULL OR (birthday ~ '^\d{4}-\d{2}-\d{2}$' AND birthday >= '1980-01-01' AND birthday <= '2010-12-31')),
  phone1                 TEXT        CHECK (phone1 IS NULL OR phone1 ~ '^[0-9]{2}-[0-9]{3}-[0-9]{2}-[0-9]{2}$'),
  phone2                 TEXT,
  father_phone           TEXT,
  father_job             TEXT,
  mother_phone           TEXT,
  mother_job             TEXT,
  email                  TEXT,
  address                TEXT        CHECK (address IS NULL OR address = UPPER(address)),

  -- 2. Educational & Tariff Details
  level                  TEXT        CHECK (level IN ('COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE')),
  level2                 TEXT        CHECK (level2 IS NULL OR level2 IN ('COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE')),
  educational_background TEXT,
  major                  TEXT,
  tariff                 TEXT        CHECK (tariff IN ('STANDART', 'PREMIUM', 'VISA PLUS', 'E-VISA', 'REGIONAL VISA')),

  -- 3. Language Certificates (Supports up to 3)
  language_certificate   TEXT        CHECK (language_certificate IS NULL OR language_certificate IN ('TOPIK', 'IELTS', 'TOEFL', 'SKA', 'NO CERTIFICATE')),
  certificate_score      TEXT,
  language_certificate_2 TEXT        CHECK (language_certificate_2 IS NULL OR language_certificate_2 IN ('TOPIK', 'IELTS', 'TOEFL', 'SKA', 'NO CERTIFICATE')),
  certificate_score_2    TEXT,
  language_certificate_3 TEXT        CHECK (language_certificate_3 IS NULL OR language_certificate_3 IN ('TOPIK', 'IELTS', 'TOEFL', 'SKA', 'NO CERTIFICATE')),
  certificate_score_3    TEXT,

  -- 4. University Selection & Statuses
  university_1           TEXT,
  university_1_status    TEXT        NOT NULL DEFAULT 'Chosen',
  university_2           TEXT,
  university_2_status    TEXT,
  university_3           TEXT,
  university_3_status    TEXT,

  -- 5. Financial Parameters
  balance                NUMERIC     NOT NULL DEFAULT 0,
  discount               NUMERIC     NOT NULL DEFAULT 0,

  -- 7. Document Checklist & Hand Counts
  pick_needed            TEXT[]      NOT NULL DEFAULT '{}',
  has_mc                 BOOLEAN     NOT NULL DEFAULT FALSE,
  bc_hand_count          INTEGER     NOT NULL DEFAULT 0,
  mc_hand_count          INTEGER     NOT NULL DEFAULT 0,
  apos_hand_count        INTEGER     NOT NULL DEFAULT 0,
  pic_hand_count         INTEGER     NOT NULL DEFAULT 0,

  -- 8. System & Management Metadata
  office                 TEXT,
  student_group          TEXT,
  lead_by                TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  jarayon_updated_at     TIMESTAMPTZ,
  is_deleted             BOOLEAN     NOT NULL DEFAULT FALSE,
  row_color              TEXT,
  status_row_color       TEXT,
  task_tags              TEXT[]      NOT NULL DEFAULT '{}'
);

-- --------------------------
-- 8. Row Level Security
-- --------------------------
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access to students
DROP POLICY IF EXISTS "students: authenticated full access" ON public.students;
CREATE POLICY "students: authenticated full access"
  ON public.students
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- --------------------------
-- 9. Triggers
-- --------------------------
DROP TRIGGER IF EXISTS set_students_updated_at ON public.students;
CREATE TRIGGER set_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- --------------------------
-- 10. Indexes
-- --------------------------
CREATE INDEX IF NOT EXISTS idx_students_full_name ON public.students(full_name);
CREATE INDEX IF NOT EXISTS idx_students_student_group ON public.students(student_group);
CREATE INDEX IF NOT EXISTS idx_students_office ON public.students(office);
CREATE INDEX IF NOT EXISTS idx_students_lead_by ON public.students(lead_by);
CREATE INDEX IF NOT EXISTS idx_students_is_deleted ON public.students(is_deleted);
