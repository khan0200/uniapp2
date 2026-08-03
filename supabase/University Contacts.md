# University Contacts

Reference for the `schools` table (see
[`20260803010000_add_schools_directory.sql`](migrations/20260803010000_add_schools_directory.sql)).
Contact details are keyed by school name and auto-fill School Address,
School Website, School Phone, and School E-mail in the Educational
Background modal whenever that name is picked or typed.

**This file is documentation, not the source of truth.** The live values
live in Supabase; edit them there (directly, or by correcting a student's
Educational Background form, which writes back to the directory). Update
this file to match afterward so it stays a useful reference — it is not
read by the app and does not need to be kept in perfect sync to function.

## How entries get here

- **`seed`** — added via a migration, gathered from the university's
  official site and/or [my.uzbmb.uz](https://my.uzbmb.uz) (the State
  Testing Centre's registry), and cross-checked against at least one
  source before being trusted.
- **`user`** — typed by staff into the Educational Background modal for a
  student. Saving upserts the value into `schools`, so the next student
  from the same school gets it automatically. A correction always
  overwrites the previous value.

Only 12 of the 176 universities in `UNIVERSITY_SUGGESTIONS`
(see [`university_directory.txt`](university_directory.txt)) have seeded
contacts. The rest fill in naturally as students from those schools are
entered — no bulk import exists for the remainder; see "Adding more" below.

## Seeded contacts (as of the last seed migration)

| University | Address | Website | Phone | E-mail |
|---|---|---|---|---|
| KOKAND STATE PEDAGOGICAL INSTITUTE | Qo'qon shahri, Turon ko'chasi | https://kspi.uz | +998 73 542 06 41 | kspi_info@edu.uz |
| TASHKENT UNIVERSITY OF INFORMATION TECHNOLOGIES | Toshkent 100084, Amir Temur shoh ko'chasi, 108-uy | https://tuit.uz | +998 71 238 64 15 | info@tuit.uz |
| TASHKENT STATE TECHNICAL UNIVERSITY | Toshkent shahri, Universitet ko'chasi, 2-uy | https://tdtu.uz | +998 71 207 14 64 | *(not found)* |
| NATIONAL UNIVERSITY OF UZBEKISTAN | 100174, Toshkent shahri, Olmazor tumani, Universitet ko'chasi, 4-uy | https://nuu.uz | *(not found)* | *(not found)* |
| TASHKENT MEDICAL ACADEMY | 100109, Toshkent shahri, Farobiy ko'chasi, 2-uy | https://tma.uz | +998 78 150 78 01 | info@tma.uz |
| SAMARKAND STATE UNIVERSITY | 140104, Samarqand shahri, Universitet xiyoboni, 15-uy | https://www.samdu.uz | +998 66 239 15 23 | devonxona@samdu.uz |
| ANDIJAN STATE UNIVERSITY | 170100, Andijon shahri, Universitet ko'chasi, 129-uy | https://adu.uz | +998 74 223 83 73 | agsu_info@edu.uz |
| FERGANA STATE UNIVERSITY | 150100, Farg'ona shahri, Murabbiylar ko'chasi, 19-uy | https://www.fdu.uz | +998 73 244 44 02 | fardu_info@umail.uz |
| NAMANGAN STATE UNIVERSITY | 160107, Namangan shahri, Boburshoh ko'chasi, 161-uy | https://namdu.uz | +998 69 228 85 02 | info@namdu.uz |
| TASHKENT STATE UNIVERSITY OF ECONOMICS | Toshkent shahri, Islom Karimov ko'chasi, 49-uy | https://tsue.uz | +998 71 239 28 66 | info@tsue.uz |
| TASHKENT STATE LAW UNIVERSITY | 100047, Toshkent shahri, Yunusobod tumani, Sayilgoh ko'chasi, 35-uy | https://tsul.uz | +998 71 233 66 36 | info@tsul.uz |
| BUKHARA STATE UNIVERSITY | Buxoro shahri, Muhammad Iqbol ko'chasi, 11-uy | https://buxdu.uz | +998 65 223 28 83 | *(not found)* |

## Adding more

Two ways to grow this directory:

1. **Let it happen naturally.** The first time staff enters Educational
   Background for a student from a school not yet in the directory, saving
   the form adds it. No action needed.

2. **Seed it ahead of time.** Add a new migration file
   (`supabase/migrations/<timestamp>_seed_schools_<topic>.sql`) following
   the pattern in
   [`20260803020000_seed_schools_directory.sql`](migrations/20260803020000_seed_schools_directory.sql):

   ```sql
   INSERT INTO schools (name, address, website, phone, email, source) VALUES
     ('EXACT NAME FROM UNIVERSITY_SUGGESTIONS',
      'address', 'https://example.uz', '+998 xx xxx xx xx', 'info@example.uz', 'seed')
   ON CONFLICT (name) DO NOTHING;
   ```

   - `name` must match an entry in `UNIVERSITY_SUGGESTIONS`
     ([`StudentDetailClient.tsx`](../src/app/(dashboard)/students/[id]/StudentDetailClient.tsx))
     exactly, or the auto-fill lookup won't find it.
   - Use `NULL` for any field you couldn't verify — don't guess. A blank
     field is safe; a wrong phone number or email is not.
   - `ON CONFLICT (name) DO NOTHING` protects any value staff has already
     corrected — a seed migration must never silently overwrite a user
     edit.
   - Verify against the university's own site or an official registry
     (my.uzbmb.uz) before adding. Aggregator sites (mabumbe.com,
     unirank.org, etc.) are useful for discovery but have been observed to
     contain garbled contact details — corroborate before trusting.
