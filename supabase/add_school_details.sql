-- Add final school / educational background details to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS final_school_name TEXT NULL,
ADD COLUMN IF NOT EXISTS gpa TEXT NULL,
ADD COLUMN IF NOT EXISTS gpa_system TEXT NULL,
ADD COLUMN IF NOT EXISTS degree_no TEXT NULL,
ADD COLUMN IF NOT EXISTS date_of_entry DATE NULL,
ADD COLUMN IF NOT EXISTS date_of_graduation DATE NULL,
-- Graduation hasn't happened yet: date_of_graduation stays NULL and this flag
-- alone records that the student is still studying.
ADD COLUMN IF NOT EXISTS graduation_expected BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS school_address TEXT NULL,
ADD COLUMN IF NOT EXISTS school_website TEXT NULL,
ADD COLUMN IF NOT EXISTS school_phone TEXT NULL,
ADD COLUMN IF NOT EXISTS school_email TEXT NULL;
