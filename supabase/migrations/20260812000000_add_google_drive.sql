-- Migration: Add Google Drive URL and Folder ID columns to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS google_drive_url text,
ADD COLUMN IF NOT EXISTS google_drive_folder_id text;
