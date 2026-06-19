-- Add newly introduced student detail fields.
-- Run this once in the Supabase SQL Editor.

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS father_job TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS mother_job TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS major TEXT;
