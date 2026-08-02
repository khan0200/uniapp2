-- Add University 4 and 5 columns to students table

ALTER TABLE students
ADD COLUMN IF NOT EXISTS university_4 TEXT,
ADD COLUMN IF NOT EXISTS university_4_status TEXT,
ADD COLUMN IF NOT EXISTS university_4_major TEXT,
ADD COLUMN IF NOT EXISTS university_5 TEXT,
ADD COLUMN IF NOT EXISTS university_5_status TEXT,
ADD COLUMN IF NOT EXISTS university_5_major TEXT;
