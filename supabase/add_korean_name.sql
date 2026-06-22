-- Add korean_name column to students table.
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS korean_name TEXT;
