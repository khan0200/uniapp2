-- Add certificate dates to students table
ALTER TABLE students
ADD COLUMN certificate_test_date DATE NULL,
ADD COLUMN certificate_valid_date DATE NULL,
ADD COLUMN certificate_2_test_date DATE NULL,
ADD COLUMN certificate_2_valid_date DATE NULL,
ADD COLUMN certificate_3_test_date DATE NULL,
ADD COLUMN certificate_3_valid_date DATE NULL;
