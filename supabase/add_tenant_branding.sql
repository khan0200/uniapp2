-- ============================================================================
-- SQL Migration: Per-Tenant Branding (Logo)
-- Run this script in your Supabase SQL Editor (Dashboard → SQL Editor)
--
-- Adds a tenant_settings table holding one row per tenant, plus a public
-- storage bucket for the uploaded logo files. The logo itself lives in
-- storage; the table only keeps its public URL.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. tenant_settings table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_settings (
    tenant_id TEXT PRIMARY KEY,
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;

-- Everyone signed in reads their own tenant's row (the sidebar needs it on
-- every page load, for every role).
DROP POLICY IF EXISTS "tenant_settings: tenant select" ON public.tenant_settings;
CREATE POLICY "tenant_settings: tenant select" ON public.tenant_settings
    FOR SELECT TO authenticated
    USING (tenant_id = public.get_user_tenant(auth.uid()));

-- Only managers change branding, and only for their own tenant.
DROP POLICY IF EXISTS "tenant_settings: manager modify" ON public.tenant_settings;
CREATE POLICY "tenant_settings: manager modify" ON public.tenant_settings
    FOR ALL TO authenticated
    USING (
        tenant_id = public.get_user_tenant(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager')
    )
    WITH CHECK (
        tenant_id = public.get_user_tenant(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager')
    );

-- ----------------------------------------------------------------------------
-- 2. Storage bucket for the logo files
-- ----------------------------------------------------------------------------
-- Public so <img src> works without a signed URL. Nothing sensitive lives
-- here — it is a company logo shown in the app's sidebar.
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Anyone may read (the bucket is public); only managers may write, and only
-- inside a folder named after their own tenant, e.g. branding/sodiq/logo.png.
DROP POLICY IF EXISTS "branding: public read" ON storage.objects;
CREATE POLICY "branding: public read" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "branding: manager write" ON storage.objects;
CREATE POLICY "branding: manager write" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'branding'
        AND (storage.foldername(name))[1] = public.get_user_tenant(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager')
    );

DROP POLICY IF EXISTS "branding: manager update" ON storage.objects;
CREATE POLICY "branding: manager update" ON storage.objects
    FOR UPDATE TO authenticated
    USING (
        bucket_id = 'branding'
        AND (storage.foldername(name))[1] = public.get_user_tenant(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager')
    );

DROP POLICY IF EXISTS "branding: manager delete" ON storage.objects;
CREATE POLICY "branding: manager delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'branding'
        AND (storage.foldername(name))[1] = public.get_user_tenant(auth.uid())
        AND public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager')
    );

-- ----------------------------------------------------------------------------
-- 3. Seed a row per existing tenant so the settings page has something to edit
-- ----------------------------------------------------------------------------
INSERT INTO public.tenant_settings (tenant_id)
SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL
ON CONFLICT (tenant_id) DO NOTHING;
