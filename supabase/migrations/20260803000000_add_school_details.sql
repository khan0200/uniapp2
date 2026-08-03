-- Educational Background: fields added after the initial school-details rollout.
-- The other nine columns (final_school_name, gpa, degree_no, date_of_entry,
-- date_of_graduation, school_address, school_website, school_phone,
-- school_email) already exist on the remote database.
ALTER TABLE students
-- GPA scale the score is measured on: 4, 4.5, 5, 100, or a free-text value.
ADD COLUMN IF NOT EXISTS gpa_system TEXT NULL,
-- Graduation hasn't happened yet: date_of_graduation stays NULL and this flag
-- alone records that the student is still studying.
ADD COLUMN IF NOT EXISTS graduation_expected BOOLEAN NOT NULL DEFAULT FALSE;
