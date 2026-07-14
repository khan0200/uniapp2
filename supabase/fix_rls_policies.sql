-- ============================================================================
-- SQL Hotfix: Clear Existing Permissive RLS Policies & Enforce Tenant Isolation
-- Run this script in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Dynamically Drop ALL Existing Policies on Isolated Tables to Clean the Slate
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN (
        'profiles', 'students', 'payments',
        'tariff_options', 'education_levels', 'student_groups', 'lead_sources',
        'offices', 'payment_methods', 'payment_receivers', 'payment_note_templates',
        'university_statuses', 'coordinators', 'folders'
      )
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON public.' || quote_ident(pol.tablename);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Enable Row-Level Security (RLS) on all Isolated Tables
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tariff_options') THEN
    ALTER TABLE public.tariff_options ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'education_levels') THEN
    ALTER TABLE public.education_levels ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_groups') THEN
    ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_sources') THEN
    ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offices') THEN
    ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods') THEN
    ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_receivers') THEN
    ALTER TABLE public.payment_receivers ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_note_templates') THEN
    ALTER TABLE public.payment_note_templates ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'university_statuses') THEN
    ALTER TABLE public.university_statuses ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coordinators') THEN
    ALTER TABLE public.coordinators ENABLE ROW LEVEL SECURITY;
  END IF;
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folders') THEN
    ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Create Tenant Isolation Policies (SELECT and ALL modification policies)
-- ----------------------------------------------------------------------------

-- A. Profiles
CREATE POLICY "profiles: self select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: self update" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles: manager select" ON public.profiles FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager') AND tenant_id = public.get_user_tenant(auth.uid()));
CREATE POLICY "profiles: manager update" ON public.profiles FOR UPDATE TO authenticated
  USING (
    tenant_id = public.get_user_tenant(auth.uid())
    AND (
      public.get_user_role(auth.uid()) = 'Head Manager' OR
      (public.get_user_role(auth.uid()) = 'Manager' AND public.get_user_role(id) != 'Head Manager')
    )
  );

-- B. Students
CREATE POLICY "students: tenant and role isolation" ON public.students FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_tenant(auth.uid())
    AND (
      public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager')
      OR created_by = auth.uid()
      OR created_by IS NULL
    )
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant(auth.uid())
    AND (
      public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager')
      OR created_by = auth.uid()
      OR created_by IS NULL
    )
  );

-- C. Payments
CREATE POLICY "payments: tenant and role isolation" ON public.payments FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_tenant(auth.uid())
    AND (
      public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager')
      OR created_by = auth.uid()
      OR created_by IS NULL
    )
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant(auth.uid())
    AND (
      public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager')
      OR created_by = auth.uid()
      OR created_by IS NULL
    )
  );

-- D. Config Tables (Tenant Isolation)
DO $$
BEGIN
  -- Tariff Options
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tariff_options') THEN
    CREATE POLICY "tariff_options: tenant select" ON public.tariff_options FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
    CREATE POLICY "tariff_options: tenant modify" ON public.tariff_options FOR ALL TO authenticated
      USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;

  -- Education Levels
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'education_levels') THEN
    CREATE POLICY "education_levels: tenant select" ON public.education_levels FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
    CREATE POLICY "education_levels: tenant modify" ON public.education_levels FOR ALL TO authenticated
      USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;

  -- Student Groups
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_groups') THEN
    CREATE POLICY "student_groups: tenant select" ON public.student_groups FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
    CREATE POLICY "student_groups: tenant modify" ON public.student_groups FOR ALL TO authenticated
      USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;

  -- Lead Sources
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_sources') THEN
    CREATE POLICY "lead_sources: tenant select" ON public.lead_sources FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
    CREATE POLICY "lead_sources: tenant modify" ON public.lead_sources FOR ALL TO authenticated
      USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;

  -- Offices
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offices') THEN
    CREATE POLICY "offices: tenant select" ON public.offices FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
    CREATE POLICY "offices: tenant modify" ON public.offices FOR ALL TO authenticated
      USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;

  -- Payment Methods
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods') THEN
    CREATE POLICY "payment_methods: tenant select" ON public.payment_methods FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
    CREATE POLICY "payment_methods: tenant modify" ON public.payment_methods FOR ALL TO authenticated
      USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;

  -- Payment Receivers
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_receivers') THEN
    CREATE POLICY "payment_receivers: tenant select" ON public.payment_receivers FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
    CREATE POLICY "payment_receivers: tenant modify" ON public.payment_receivers FOR ALL TO authenticated
      USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;

  -- Payment Note Templates
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_note_templates') THEN
    CREATE POLICY "payment_note_templates: tenant select" ON public.payment_note_templates FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
    CREATE POLICY "payment_note_templates: tenant modify" ON public.payment_note_templates FOR ALL TO authenticated
      USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;

  -- University Statuses
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'university_statuses') THEN
    CREATE POLICY "university_statuses: tenant select" ON public.university_statuses FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
    CREATE POLICY "university_statuses: tenant modify" ON public.university_statuses FOR ALL TO authenticated
      USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;

  -- Coordinators
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coordinators') THEN
    CREATE POLICY "coordinators: tenant select" ON public.coordinators FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
    CREATE POLICY "coordinators: tenant modify" ON public.coordinators FOR ALL TO authenticated
      USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;

  -- Folders
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folders') THEN
    CREATE POLICY "folders: tenant select" ON public.folders FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant(auth.uid()));
    CREATE POLICY "folders: tenant modify" ON public.folders FOR ALL TO authenticated
      USING (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (tenant_id = public.get_user_tenant(auth.uid()) AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;
END $$;
