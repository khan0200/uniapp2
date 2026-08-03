-- Seed contact details for frequently-attended Uzbek universities.
--
-- Gathered from each institution's official site and my.uzbmb.uz (the State
-- Testing Centre's registry) in August 2026. Only entries corroborated by at
-- least one authoritative source are included; the rest of the 176-school
-- catalogue is left for staff to fill in as students come through, which the
-- app records automatically on save.
--
-- Names must match UNIVERSITY_SUGGESTIONS in StudentDetailClient.tsx exactly.
-- ON CONFLICT DO NOTHING so a user-corrected row is never overwritten by a
-- later re-run of this seed.
INSERT INTO schools (name, address, website, phone, email, source) VALUES
  ('KOKAND STATE PEDAGOGICAL INSTITUTE',
   'Qo''qon shahri, Turon ko''chasi', 'https://kspi.uz', '+998 73 542 06 41', 'kspi_info@edu.uz', 'seed'),

  ('TASHKENT UNIVERSITY OF INFORMATION TECHNOLOGIES',
   'Toshkent 100084, Amir Temur shoh ko''chasi, 108-uy', 'https://tuit.uz', '+998 71 238 64 15', 'info@tuit.uz', 'seed'),

  ('TASHKENT STATE TECHNICAL UNIVERSITY',
   'Toshkent shahri, Universitet ko''chasi, 2-uy', 'https://tdtu.uz', '+998 71 207 14 64', NULL, 'seed'),

  ('NATIONAL UNIVERSITY OF UZBEKISTAN',
   '100174, Toshkent shahri, Olmazor tumani, Universitet ko''chasi, 4-uy', 'https://nuu.uz', NULL, NULL, 'seed'),

  ('TASHKENT MEDICAL ACADEMY',
   '100109, Toshkent shahri, Farobiy ko''chasi, 2-uy', 'https://tma.uz', '+998 78 150 78 01', 'info@tma.uz', 'seed'),

  ('SAMARKAND STATE UNIVERSITY',
   '140104, Samarqand shahri, Universitet xiyoboni, 15-uy', 'https://www.samdu.uz', '+998 66 239 15 23', 'devonxona@samdu.uz', 'seed'),

  ('ANDIJAN STATE UNIVERSITY',
   '170100, Andijon shahri, Universitet ko''chasi, 129-uy', 'https://adu.uz', '+998 74 223 83 73', 'agsu_info@edu.uz', 'seed'),

  ('FERGANA STATE UNIVERSITY',
   '150100, Farg''ona shahri, Murabbiylar ko''chasi, 19-uy', 'https://www.fdu.uz', '+998 73 244 44 02', 'fardu_info@umail.uz', 'seed'),

  ('NAMANGAN STATE UNIVERSITY',
   '160107, Namangan shahri, Boburshoh ko''chasi, 161-uy', 'https://namdu.uz', '+998 69 228 85 02', 'info@namdu.uz', 'seed'),

  ('TASHKENT STATE UNIVERSITY OF ECONOMICS',
   'Toshkent shahri, Islom Karimov ko''chasi, 49-uy', 'https://tsue.uz', '+998 71 239 28 66', 'info@tsue.uz', 'seed'),

  ('TASHKENT STATE LAW UNIVERSITY',
   '100047, Toshkent shahri, Yunusobod tumani, Sayilgoh ko''chasi, 35-uy', 'https://tsul.uz', '+998 71 233 66 36', 'info@tsul.uz', 'seed'),

  ('BUKHARA STATE UNIVERSITY',
   'Buxoro shahri, Muhammad Iqbol ko''chasi, 11-uy', 'https://buxdu.uz', '+998 65 223 28 83', NULL, 'seed')
ON CONFLICT (name) DO NOTHING;
