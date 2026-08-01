-- ============================================================================
-- SQL Migration: Fix Multi-Tenant Configuration Uniqueness Constraints
-- Run this script in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================================

-- 1. Dynamically find and drop the old UNIQUE constraint on the 'name' column for lookup tables
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN 
        SELECT 
            tc.table_name, 
            tc.constraint_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
        WHERE 
            tc.constraint_type = 'UNIQUE'
            AND tc.table_schema = 'public'
            AND kcu.column_name = 'name'
            AND tc.table_name IN (
                'tariff_options', 'education_levels', 'student_groups', 'lead_sources',
                'offices', 'payment_methods', 'payment_receivers', 'payment_note_templates',
                'university_statuses', 'coordinators', 'folders'
            )
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE;';
    END LOOP;
END $$;

-- 2. Add composite UNIQUE constraints scoped to (tenant_id, name)
DO $$
BEGIN
  -- Tariff Options
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tariff_options') THEN
    ALTER TABLE public.tariff_options ADD CONSTRAINT tariff_options_tenant_name_key UNIQUE (tenant_id, name);
  END IF;

  -- Education Levels
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'education_levels') THEN
    ALTER TABLE public.education_levels ADD CONSTRAINT education_levels_tenant_name_key UNIQUE (tenant_id, name);
  END IF;

  -- Student Groups
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_groups') THEN
    ALTER TABLE public.student_groups ADD CONSTRAINT student_groups_tenant_name_key UNIQUE (tenant_id, name);
  END IF;

  -- Lead Sources
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_sources') THEN
    ALTER TABLE public.lead_sources ADD CONSTRAINT lead_sources_tenant_name_key UNIQUE (tenant_id, name);
  END IF;

  -- Offices
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offices') THEN
    ALTER TABLE public.offices ADD CONSTRAINT offices_tenant_name_key UNIQUE (tenant_id, name);
  END IF;

  -- Payment Methods
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_methods') THEN
    ALTER TABLE public.payment_methods ADD CONSTRAINT payment_methods_tenant_name_key UNIQUE (tenant_id, name);
  END IF;

  -- Payment Receivers
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_receivers') THEN
    ALTER TABLE public.payment_receivers ADD CONSTRAINT payment_receivers_tenant_name_key UNIQUE (tenant_id, name);
  END IF;

  -- Payment Note Templates
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_note_templates') THEN
    ALTER TABLE public.payment_note_templates ADD CONSTRAINT payment_note_templates_tenant_name_key UNIQUE (tenant_id, name);
  END IF;

  -- University Statuses
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'university_statuses') THEN
    ALTER TABLE public.university_statuses ADD CONSTRAINT university_statuses_tenant_name_key UNIQUE (tenant_id, name);
  END IF;

  -- Coordinators
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coordinators') THEN
    ALTER TABLE public.coordinators ADD CONSTRAINT coordinators_tenant_name_key UNIQUE (tenant_id, name);
  END IF;

  -- Folders
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'folders') THEN
    ALTER TABLE public.folders ADD CONSTRAINT folders_tenant_name_key UNIQUE (tenant_id, name);
  END IF;
END $$;
