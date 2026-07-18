-- ============================================================
-- Add KDB put and take columns to students table
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS kdb_put_date TEXT,
ADD COLUMN IF NOT EXISTS kdb_take_date TEXT;
