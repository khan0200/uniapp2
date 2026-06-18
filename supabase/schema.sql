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

-- Users can read their own profile
CREATE POLICY "profiles: self select"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Managers can read ALL profiles
CREATE POLICY "profiles: manager full select"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'Manager'
    )
  );

-- Users can update their own profile (except role)
CREATE POLICY "profiles: self update"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Managers can update any profile (including role assignment)
CREATE POLICY "profiles: manager full update"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'Manager'
    )
  );

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
