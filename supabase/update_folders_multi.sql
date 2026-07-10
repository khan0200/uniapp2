-- ============================================================
-- Student Folders Multiple Assignment Setup
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Add folder_ids column as UUID array to public.students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS folder_ids UUID[] DEFAULT '{}'::UUID[] NOT NULL;

-- 2. Migrate existing single folder_id values to folder_ids array
UPDATE public.students
SET folder_ids = ARRAY[folder_id]
WHERE folder_id IS NOT NULL AND (folder_ids IS NULL OR cardinality(folder_ids) = 0);
