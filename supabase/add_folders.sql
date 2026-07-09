-- ============================================================
-- Student Folders Feature Setup
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create public.folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add folder_id to public.students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL;

-- 3. Enable Row Level Security (RLS) on folders table
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

-- 4. Recreate RLS Policies on folders table (assuming same rules as General Options)
DROP POLICY IF EXISTS "folders: manager full select" ON public.folders;
CREATE POLICY "folders: manager full select" ON public.folders
    FOR SELECT
    USING (public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));

DROP POLICY IF EXISTS "folders: manager full insert" ON public.folders;
CREATE POLICY "folders: manager full insert" ON public.folders
    FOR INSERT
    WITH CHECK (public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));

DROP POLICY IF EXISTS "folders: manager full update" ON public.folders;
CREATE POLICY "folders: manager full update" ON public.folders
    FOR UPDATE
    USING (public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));

DROP POLICY IF EXISTS "folders: manager full delete" ON public.folders;
CREATE POLICY "folders: manager full delete" ON public.folders
    FOR DELETE
    USING (public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
