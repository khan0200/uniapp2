/**
 * Standalone CLI Script: Migrate Firestore Students to Supabase
 * Running instructions:
 *   node scripts/migrate-firestore.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read environment variables from .env.local
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

// Configuration for unibridge-7d530
const FIREBASE_PROJECT_ID = 'unibridge-7d530';
const COLLECTION_NAME = 'students';

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: Uzbek phone number cleaner & formatter
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

// Convert Firestore REST document structure to clean object
function convertFirestoreRestDoc(doc) {
  const fields = doc.fields || {};
  const result = {};
  
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue, 10);
    else if (value.doubleValue !== undefined) result[key] = parseFloat(value.doubleValue);
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.arrayValue !== undefined) {
      const values = value.arrayValue.values || [];
      result[key] = values.map(v => v.stringValue || v.integerValue || JSON.stringify(v));
    } else if (value.mapValue !== undefined) {
      result[key] = value.mapValue.fields; // simplified
    } else if (value.nullValue !== undefined) {
      result[key] = null;
    }
  }

  // extract name/id from path if needed
  const nameParts = doc.name.split('/');
  result.firestoreId = nameParts[nameParts.length - 1];
  return result;
}

const LEVEL_VALUES = ['COLLEGE', 'BACHELOR', 'MASTERS', 'MASTER NO CERTIFICATE', 'LANGUAGE COURSE'];
const TARIFF_VALUES = ['STANDART', 'PREMIUM', 'VISA PLUS', 'E-VISA', 'REGIONAL VISA'];
const CERT_VALUES = ['TOPIK', 'IELTS', 'TOEFL', 'SKA', 'NO CERTIFICATE'];

// Sanitize & map records according to Supabase check constraints
function sanitizeRecord(raw) {
  const mapped = {};

  const getVal = (keys) => {
    for (const key of keys) {
      if (raw[key] !== undefined && raw[key] !== null) return raw[key];
    }
    return undefined;
  };

  // Primary Info (Must be uppercase)
  const idVal = getVal(['id', 'firestoreId']);
  if (!idVal) return null; // ID is required
  mapped.id = String(idVal).trim().toUpperCase();

  const nameVal = getVal(['fullName', 'full_name']);
  if (!nameVal) return null; // Name is required
  mapped.full_name = String(nameVal).trim().toUpperCase();

  mapped.passport = getVal(['passport']) ? String(getVal(['passport'])).trim().toUpperCase() : null;
  mapped.passport_issue_date = getVal(['passportIssueDate', 'passport_issue_date']) ? String(getVal(['passportIssueDate', 'passport_issue_date'])).trim() : null;
  mapped.passport_expire_date = getVal(['passportExpireDate', 'passport_expire_date']) ? String(getVal(['passportExpireDate', 'passport_expire_date'])).trim() : null;

  // Gender 'MALE' | 'FEMALE' | null
  const genderVal = getVal(['sex', 'gender']);
  if (genderVal) {
    const g = String(genderVal).trim().toUpperCase();
    if (g === 'MALE' || g === 'M' || g === 'ERKAK') mapped.gender = 'MALE';
    else if (g === 'FEMALE' || g === 'F' || g === 'AYOL') mapped.gender = 'FEMALE';
    else mapped.gender = null;
  } else {
    mapped.gender = null;
  }

  // Birthday constraint: YYYY-MM-DD and range 1980-2010
  const bdayVal = getVal(['birthday']);
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
  mapped.phone1 = cleanUzbekPhone(getVal(['phone1']));
  mapped.phone2 = getVal(['phone2']) ? String(getVal(['phone2'])).trim() : null;

  // Parents details
  mapped.father_phone = getVal(['fatherPhone', 'father_phone']) || null;
  mapped.father_job = getVal(['fatherJob', 'father_job']) || null;
  mapped.mother_phone = getVal(['motherPhone', 'mother_phone']) || null;
  mapped.mother_job = getVal(['motherJob', 'mother_job']) || null;

  // Address
  mapped.address = getVal(['address']) ? String(getVal(['address'])).trim().toUpperCase() : null;
  mapped.email = getVal(['email']) || null;

  // Study levels
  const levelVal = getVal(['level']);
  mapped.level = levelVal && LEVEL_VALUES.includes(String(levelVal).trim().toUpperCase()) ? String(levelVal).trim().toUpperCase() : null;

  const level2Val = getVal(['level2']);
  mapped.level2 = level2Val && LEVEL_VALUES.includes(String(level2Val).trim().toUpperCase()) ? String(level2Val).trim().toUpperCase() : null;

  mapped.educational_background = getVal(['educationalBackground', 'educational_background']) || null;
  mapped.major = getVal(['major']) || null;

  // Tariff check
  const tariffVal = getVal(['tariff']);
  mapped.tariff = tariffVal && TARIFF_VALUES.includes(String(tariffVal).trim().toUpperCase()) ? String(tariffVal).trim().toUpperCase() : null;

  // Language certificate check
  const mapCert = (val) => {
    if (!val) return 'NO CERTIFICATE';
    const c = String(val).trim().toUpperCase();
    return CERT_VALUES.includes(c) ? c : 'NO CERTIFICATE';
  };
  mapped.language_certificate = mapCert(getVal(['languageCertificate', 'language_certificate']));
  mapped.certificate_score = getVal(['certificateScore', 'certificate_score']) || null;
  mapped.language_certificate_2 = mapCert(getVal(['languageCertificate2', 'language_certificate_2']));
  mapped.certificate_score_2 = getVal(['certificateScore2', 'certificate_score_2']) || null;
  mapped.language_certificate_3 = mapCert(getVal(['languageCertificate3', 'language_certificate_3']));
  mapped.certificate_score_3 = getVal(['certificateScore3', 'certificate_score_3']) || null;

  // Universities
  mapped.university_1 = getVal(['university1', 'university_1']) || null;
  mapped.university_1_status = getVal(['university1Status', 'university_1_status']) || 'Chosen';
  mapped.university_2 = getVal(['university2', 'university_2']) || null;
  mapped.university_2_status = getVal(['university2Status', 'university_2_status']) || null;
  mapped.university_3 = getVal(['university3', 'university_3']) || null;
  mapped.university_3_status = getVal(['university3Status', 'university_3_status']) || null;

  // Balance / Financials
  mapped.balance = parseFloat(getVal(['balance']) || 0) || 0;
  mapped.discount = parseFloat(getVal(['discount']) || 0) || 0;

  // Office / Metadata
  mapped.office = getVal(['office']) || null;
  mapped.student_group = getVal(['group', 'student_group']) || null;
  mapped.lead_by = getVal(['leadBy', 'lead_by']) || null;
  mapped.notes = getVal(['notes']) || null;

  // Dates
  mapped.created_at = getVal(['createdAt', 'created_at']) || new Date().toISOString();
  mapped.updated_at = getVal(['updatedAt', 'updated_at']) || new Date().toISOString();
  mapped.jarayon_updated_at = getVal(['jarayonUpdatedAt', 'jarayon_updated_at']) || null;
  
  // Row Colors
  mapped.row_color = getVal(['rowColor', 'row_color']) || null;
  mapped.status_row_color = getVal(['statusRowColor', 'status_row_color']) || null;

  // Task tags
  const tags = getVal(['taskTags', 'task_tags']);
  if (Array.isArray(tags)) mapped.task_tags = tags.map(String);
  else if (tags && typeof tags === 'string') mapped.task_tags = tags.split(',').map(t => t.trim()).filter(Boolean);
  else mapped.task_tags = [];

  // Hand counts defaults
  mapped.pick_needed = getVal(['pickNeeded', 'pick_needed']) || [];
  mapped.has_mc = !!getVal(['hasMc', 'has_mc']);
  mapped.bc_hand_count = parseInt(getVal(['bcHandCount', 'bc_hand_count']) || 0, 10) || 0;
  mapped.mc_hand_count = parseInt(getVal(['mcHandCount', 'mc_hand_count']) || 0, 10) || 0;
  mapped.apos_hand_count = parseInt(getVal(['aposHandCount', 'apos_hand_count']) || 0, 10) || 0;
  mapped.pic_hand_count = parseInt(getVal(['picHandCount', 'pic_hand_count']) || 0, 10) || 0;
  mapped.is_deleted = !!getVal(['deleted', 'isDeleted', 'is_deleted']);

  return mapped;
}

// 2. Fetch from Firestore via public REST API
async function runMigration() {
  console.log(`📡 Fetching from Firestore collection "${COLLECTION_NAME}" in project "${FIREBASE_PROJECT_ID}"...`);
  
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${COLLECTION_NAME}?pageSize=1000`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`REST API fetch failed with status ${res.status}`);
    }

    const data = await res.json();
    const documents = data.documents || [];
    
    console.log(`✅ Fetched ${documents.length} raw student documents from Firestore.`);

    const cleanedStudents = [];
    for (const doc of documents) {
      const raw = convertFirestoreRestDoc(doc);
      const clean = sanitizeRecord(raw);
      if (clean) {
        cleanedStudents.push(clean);
      }
    }

    console.log(`🧹 Cleaned & Sanitized ${cleanedStudents.length} / ${documents.length} documents.`);
    
    if (cleanedStudents.length === 0) {
      console.log('⚠️ No valid student records to migrate.');
      return;
    }

    console.log(`📤 Upserting ${cleanedStudents.length} records into Supabase "students" table...`);

    // Bulk upsert to Supabase
    const { data: upsertData, error } = await supabase
      .from('students')
      .upsert(cleanedStudents, { onConflict: 'id' });

    if (error) {
      throw error;
    }

    console.log('🎉 Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message || err);
  }
}

runMigration();
