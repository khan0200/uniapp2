-- ============================================================================
-- SQL Migration: Add University-Specific Major Columns to Students Table
-- Run this script in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================================

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS university_1_major TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS university_2_major TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS university_3_major TEXT;
