/**
 * Standalone CLI Script: Migrate CSV/Excel Student Data to Supabase
 * Running instructions:
 *   node scripts/migrate-csv.js <path-to-csv-file>
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Get CSV file path from arguments
const csvFileArg = process.argv[2];
if (!csvFileArg) {
  console.error('❌ Error: Please provide the path to your CSV file.');
  console.error('Usage: node scripts/migrate-csv.js <path-to-students.csv>');
  process.exit(1);
}

const csvFilePath = path.resolve(csvFileArg);
if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ Error: CSV File not found at path: "${csvFilePath}"`);
  process.exit(1);
}

// 2. Read environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL or Anon Key not found in .env.local');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

// 3. Zero-dependency robust CSV Parser
function parseCSV(csvContent) {
  const lines = [];
  let row = [''];
  let inQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++; // skip double quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push('');
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++; // skip \n
      if (row.length > 1 || row[0] !== '') {
        lines.push(row);
      }
      row = [''];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }
  return lines;
}

// Uzbek phone cleaner
function cleanUzbekPhone(phoneStr) {
  if (!phoneStr) return null;
  const cleaned = String(phoneStr).replace(/\D/g, '');
  if (!cleaned) return null;

  if (cleaned.length === 9) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 7)}-${cleaned.slice(7, 9)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('998')) {
    const main = cleaned.slice(3);
    return `${main.slice(0, 2)}-${main.slice(2, 5)}-${main.slice(5, 7)}-${main.slice(7, 9)}`;
  }
  if (cleaned.length > 9) {
    const main = cleaned.slice(-9);
    return `${main.slice(0, 2)}-${main.slice(2, 5)}-${main.slice(5, 7)}-${main.slice(7, 9)}`;
  }
  return null;
}

const LEVEL_VALUES = ['COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE'];
const TARIFF_VALUES = ['STANDART', 'PREMIUM', 'VISA PLUS', 'E-VISA', 'REGIONAL VISA'];
const CERT_VALUES = ['TOPIK', 'IELTS', 'TOEFL', 'SKA', 'NO CERTIFICATE'];

// Sanitize & map records according to Supabase check constraints
function sanitizeRecord(raw, mapping) {
  const mapped = {};

  const getVal = (field) => {
    const csvHeader = mapping[field];
    if (csvHeader && raw[csvHeader] !== undefined && raw[csvHeader] !== null) {
      return raw[csvHeader];
    }
    return undefined;
  };

  // Primary Info (Must be uppercase)
  const idVal = getVal('id');
  if (!idVal) return null; // ID is required
  mapped.id = String(idVal).trim().toUpperCase();

  const nameVal = getVal('full_name');
  if (!nameVal) return null; // Name is required
  mapped.full_name = String(nameVal).trim().toUpperCase();

  mapped.passport = getVal('passport') ? String(getVal('passport')).trim().toUpperCase() : null;
  mapped.passport_issue_date = getVal('passport_issue_date') ? String(getVal('passport_issue_date')).trim() : null;
  mapped.passport_expire_date = getVal('passport_expire_date') ? String(getVal('passport_expire_date')).trim() : null;

  // Gender 'MALE' | 'FEMALE' | null
  const genderVal = getVal('gender');
  if (genderVal) {
    const g = String(genderVal).trim().toUpperCase();
    if (g === 'MALE' || g === 'M' || g === 'ERKAK') mapped.gender = 'MALE';
    else if (g === 'FEMALE' || g === 'F' || g === 'AYOL') mapped.gender = 'FEMALE';
    else mapped.gender = null;
  } else {
    mapped.gender = null;
  }

  // Birthday constraint: YYYY-MM-DD and range 1980-2010
  const bdayVal = getVal('birthday');
  if (bdayVal) {
    const bdayStr = String(bdayVal).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(bdayStr)) {
      const year = parseInt(bdayStr.split('-')[0], 10);
      if (year >= 1980 && year <= 2010) mapped.birthday = bdayStr;
      else mapped.birthday = null;
    } else {
      mapped.birthday = null;
    }
  } else {
    mapped.birthday = null;
  }

  // Uzbek Phone constraints
  mapped.phone1 = cleanUzbekPhone(getVal('phone1'));
  mapped.phone2 = getVal('phone2') ? String(getVal('phone2')).trim() : null;

  // Parents details
  mapped.father_phone = getVal('father_phone') || null;
  mapped.father_job = getVal('father_job') || null;
  mapped.mother_phone = getVal('mother_phone') || null;
  mapped.mother_job = getVal('mother_job') || null;

  // Address
  mapped.address = getVal('address') ? String(getVal('address')).trim().toUpperCase() : null;
  mapped.email = getVal('email') || null;

  // Study levels
  const levelVal = getVal('level');
  mapped.level = levelVal && LEVEL_VALUES.includes(String(levelVal).trim().toUpperCase()) ? String(levelVal).trim().toUpperCase() : null;

  const level2Val = getVal('level2');
  mapped.level2 = level2Val && LEVEL_VALUES.includes(String(level2Val).trim().toUpperCase()) ? String(level2Val).trim().toUpperCase() : null;

  mapped.educational_background = getVal('educational_background') || null;
  mapped.major = getVal('major') || null;

  // Tariff check
  const tariffVal = getVal('tariff');
  mapped.tariff = tariffVal && TARIFF_VALUES.includes(String(tariffVal).trim().toUpperCase()) ? String(tariffVal).trim().toUpperCase() : null;

  // Language certificate check
  const mapCert = (val) => {
    if (!val) return 'NO CERTIFICATE';
    const c = String(val).trim().toUpperCase();
    return CERT_VALUES.includes(c) ? c : 'NO CERTIFICATE';
  };
  mapped.language_certificate = mapCert(getVal('language_certificate'));
  mapped.certificate_score = getVal('certificate_score') || null;
  mapped.language_certificate_2 = mapCert(getVal('language_certificate_2'));
  mapped.certificate_score_2 = getVal('certificate_score_2') || null;
  mapped.language_certificate_3 = mapCert(getVal('language_certificate_3'));
  mapped.certificate_score_3 = getVal('certificate_score_3') || null;

  // Universities
  mapped.university_1 = getVal('university_1') || null;
  mapped.university_1_status = getVal('university_1_status') || 'Chosen';
  mapped.university_2 = getVal('university_2') || null;
  mapped.university_2_status = getVal('university_2_status') || null;
  mapped.university_3 = getVal('university_3') || null;
  mapped.university_3_status = getVal('university_3_status') || null;

  // Balance / Financials
  mapped.balance = parseFloat(getVal('balance') || 0) || 0;
  mapped.discount = parseFloat(getVal('discount') || 0) || 0;

  // Office / Metadata
  mapped.office = getVal('office') || null;
  mapped.student_group = getVal('student_group') || null;
  mapped.lead_by = getVal('lead_by') || null;
  mapped.notes = getVal('notes') || null;

  // Row Colors
  mapped.row_color = getVal('row_color') || null;
  mapped.status_row_color = getVal('status_row_color') || null;

  // Defaults
  mapped.is_deleted = false;
  mapped.task_tags = [];
  mapped.pick_needed = [];
  mapped.has_mc = false;
  mapped.bc_hand_count = 0;
  mapped.mc_hand_count = 0;
  mapped.apos_hand_count = 0;
  mapped.pic_hand_count = 0;

  return mapped;
}

// Run CSV Importer
async function runCSVImport() {
  console.log(`📖 Reading CSV file: "${csvFilePath}"...`);
  
  try {
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    const parsedLines = parseCSV(csvContent);

    if (parsedLines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row.');
    }

    const headers = parsedLines[0].map(h => h.trim());
    console.log(`✅ CSV file parsed successfully. Found columns: [ ${headers.join(', ')} ]`);

    // Intelligent Mapping auto-detector
    const mapping = {};
    const cleanString = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const detectHeader = (field, aliases) => {
      const cleanAliases = aliases.map(cleanString);
      const match = headers.find(h => {
        const cleanedH = cleanString(h);
        return cleanAliases.some(alias => cleanedH.includes(alias) || alias.includes(cleanedH));
      });
      if (match) mapping[field] = match;
    };

    detectHeader('id', ['student id', 'id', 'kod', 'index', 'number']);
    detectHeader('full_name', ['full name', 'name', 'f.i.sh', 'fish', 'ism', 'fullname']);
    detectHeader('passport', ['passport', 'pass', 'seriya']);
    detectHeader('passport_issue_date', ['date of issue', 'issue date', 'passport issue']);
    detectHeader('passport_expire_date', ['date of expiration', 'expiration date', 'passport expire', 'expire date']);
    detectHeader('gender', ['gender', 'sex', 'jins']);
    detectHeader('birthday', ['birthday', 'birth', 'tugilgan', 'date']);
    detectHeader('phone1', ['phone 1', 'phone1', 'phone', 'tel1', 'telefon', 'phone number']);
    detectHeader('phone2', ['phone 2', 'phone2', 'tel2', 'qoshimcha tel']);
    
    detectHeader('father_phone', ['father phone', 'otasi tel', 'ota tel']);
    detectHeader('father_job', ['father job', 'father work', 'ota kasb']);
    detectHeader('mother_phone', ['mother phone', 'onasi tel', 'ona tel']);
    detectHeader('mother_job', ['mother job', 'mother work', 'ona kasb']);
    
    detectHeader('email', ['email', 'pochta']);
    detectHeader('address', ['address', 'manzil']);
    
    detectHeader('level', ['education level 1', 'level 1', 'level', 'bosqich 1', 'daraja 1']);
    detectHeader('level2', ['education level 2', 'level 2', 'bosqich 2', 'daraja 2']);
    detectHeader('educational_background', ['educational background', 'background', 'malumoti']);
    detectHeader('major', ['major', 'yonalish']);
    detectHeader('tariff', ['tariff', 'tarif', 'package']);
    
    detectHeader('language_certificate', ['language certificate 1', 'certificate 1', 'cert 1', 'sertifikat 1']);
    detectHeader('certificate_score', ['score 1', 'ball 1', 'score1', 'ball1']);
    detectHeader('language_certificate_2', ['language certificate 2', 'certificate 2', 'cert 2', 'sertifikat 2']);
    detectHeader('certificate_score_2', ['score 2', 'ball 2', 'score2', 'ball2']);
    detectHeader('language_certificate_3', ['language certificate 3', 'certificate 3', 'cert 3', 'sertifikat 3']);
    detectHeader('certificate_score_3', ['score 3', 'ball 3', 'score3', 'ball3']);
    
    detectHeader('university_1', ['university 1', 'universitet 1', 'otm 1', 'university1']);
    detectHeader('university_1_status', ['university 1 status', 'otm 1 status', 'university1status']);
    detectHeader('university_2', ['university 2', 'universitet 2', 'otm 2', 'university2']);
    detectHeader('university_2_status', ['university 2 status', 'otm 2 status', 'university2status']);
    detectHeader('university_3', ['university 3', 'universitet 3', 'otm 3', 'university3']);
    detectHeader('university_3_status', ['university 3 status', 'otm 3 status', 'university3status']);
    
    detectHeader('balance', ['balance', 'balans', 'qoldiq']);
    detectHeader('discount', ['discount', 'chegirma']);
    detectHeader('office', ['office', 'offis', 'filial']);
    detectHeader('student_group', ['group', 'guruh']);
    detectHeader('lead_by', ['lead by', 'manba', 'lead']);
    detectHeader('notes', ['note', 'notes', 'izoh']);

    console.log('📌 Active Column Mappings:', JSON.stringify(mapping, null, 2));

    const records = [];
    for (let i = 1; i < parsedLines.length; i++) {
      const row = parsedLines[i];
      if (row.length !== headers.length) continue; // skip broken lines
      
      const rawRow = {};
      headers.forEach((h, idx) => {
        rawRow[h] = row[idx];
      });

      const clean = sanitizeRecord(rawRow, mapping);
      if (clean) {
        records.push(clean);
      }
    }

    console.log(`🧹 Cleaned & Sanitized ${records.length} records.`);

    if (records.length === 0) {
      console.log('⚠️ No valid student records to import.');
      return;
    }

    console.log(`📤 Upserting ${records.length} records into Supabase "students" table...`);

    // Bulk upsert chunks of 50
    const chunkSize = 50;
    let upsertCount = 0;

    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('students')
        .upsert(chunk, { onConflict: 'id' });

      if (error) throw error;
      upsertCount += chunk.length;
      console.log(`   └─ Batch [${i + 1}-${i + chunk.length}] uploaded`);
    }

    console.log(`🎉 Import completed successfully! Uploaded ${upsertCount} records.`);
  } catch (err) {
    console.error('❌ Import failed:', err.message || err);
  }
}

runCSVImport();
