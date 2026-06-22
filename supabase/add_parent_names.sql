-- Add Father Fullname and Mother Fullname columns.
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_name TEXT;
