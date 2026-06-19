/**
 * CLI Script: Sync Firestore Students and Payments to Supabase
 * Correctly matches payment histories by mapping Firestore doc IDs.
 *
 * Running instructions:
 *   node scripts/sync-firestore.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
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

const FIREBASE_PROJECT_ID = 'unibridge-7d530';
const supabase = createClient(supabaseUrl, supabaseKey);

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
    } else if (value.timestampValue !== undefined) {
      result[key] = value.timestampValue;
    }
  }

  const nameParts = doc.name.split('/');
  result.firestoreId = nameParts[nameParts.length - 1];
  return result;
}

// Deterministic UUID generator for payments based on Firestore ID
function firestoreIdToUUID(firestoreId) {
  const hash = crypto.createHash('sha1').update(firestoreId).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

// Fetch all documents in a Firestore collection
async function fetchFirestoreCollection(collectionName) {
  let pageToken = '';
  let allDocuments = [];
  
  do {
    let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=1000`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`REST API fetch failed for "${collectionName}" with status ${res.status}`);
    }

    const data = await res.json();
    const docs = data.documents || [];
    allDocuments = allDocuments.concat(docs);
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  console.log(`   └─ Fetched ${allDocuments.length} raw records from Firestore collection "${collectionName}"`);
  return allDocuments.map(convertFirestoreRestDoc);
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

// Sanitize & map students record
function sanitizeStudent(raw) {
  const mapped = {};
  const getVal = (keys) => {
    for (const key of keys) {
      if (raw[key] !== undefined && raw[key] !== null) return raw[key];
    }
    return undefined;
  };

  const idVal = getVal(['id', 'firestoreId']);
  if (!idVal) return null;
  mapped.id = String(idVal).trim().toUpperCase();

  const nameVal = getVal(['fullName', 'full_name']);
  if (!nameVal) return null;
  mapped.full_name = String(nameVal).trim().toUpperCase();

  mapped.passport = getVal(['passport']) ? String(getVal(['passport'])).trim().toUpperCase() : null;
  mapped.passport_issue_date = getVal(['passportIssueDate', 'passport_issue_date']) ? String(getVal(['passportIssueDate', 'passport_issue_date'])).trim() : null;
  mapped.passport_expire_date = getVal(['passportExpireDate', 'passport_expire_date']) ? String(getVal(['passportExpireDate', 'passport_expire_date'])).trim() : null;

  const genderVal = getVal(['sex', 'gender']);
  if (genderVal) {
    const g = String(genderVal).trim().toUpperCase();
    if (g === 'MALE' || g === 'M' || g === 'ERKAK') mapped.gender = 'MALE';
    else if (g === 'FEMALE' || g === 'F' || g === 'AYOL') mapped.gender = 'FEMALE';
    else mapped.gender = null;
  } else {
    mapped.gender = null;
  }

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

  mapped.phone1 = cleanUzbekPhone(getVal(['phone1']));
  mapped.phone2 = getVal(['phone2']) ? String(getVal(['phone2'])).trim() : null;

  mapped.father_phone = getVal(['fatherPhone', 'father_phone']) || null;
  mapped.father_job = getVal(['fatherJob', 'father_job']) || null;
  mapped.mother_phone = getVal(['motherPhone', 'mother_phone']) || null;
  mapped.mother_job = getVal(['motherJob', 'mother_job']) || null;

  mapped.address = getVal(['address']) ? String(getVal(['address'])).trim().toUpperCase() : null;
  mapped.email = getVal(['email']) || null;

  const levelVal = getVal(['level']);
  mapped.level = levelVal && LEVEL_VALUES.includes(String(levelVal).trim().toUpperCase()) ? String(levelVal).trim().toUpperCase() : null;

  const level2Val = getVal(['level2']);
  mapped.level2 = level2Val && LEVEL_VALUES.includes(String(level2Val).trim().toUpperCase()) ? String(level2Val).trim().toUpperCase() : null;

  mapped.educational_background = getVal(['educationalBackground', 'educational_background']) || null;
  mapped.major = getVal(['major']) || null;

  const tariffVal = getVal(['tariff']);
  mapped.tariff = tariffVal && TARIFF_VALUES.includes(String(tariffVal).trim().toUpperCase()) ? String(tariffVal).trim().toUpperCase() : null;

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

  mapped.university_1 = getVal(['university1', 'university_1']) || null;
  mapped.university_1_status = getVal(['university1Status', 'university_1_status']) || 'Chosen';
  mapped.university_2 = getVal(['university2', 'university_2']) || null;
  mapped.university_2_status = getVal(['university2Status', 'university_2_status']) || null;
  mapped.university_3 = getVal(['university3', 'university_3']) || null;
  mapped.university_3_status = getVal(['university3Status', 'university_3_status']) || null;

  mapped.balance = parseFloat(getVal(['balance']) || 0) || 0;
  mapped.discount = parseFloat(getVal(['discount']) || 0) || 0;

  mapped.office = getVal(['office']) || null;
  mapped.student_group = getVal(['group', 'student_group']) || null;
  mapped.lead_by = getVal(['leadBy', 'lead_by']) || null;
  mapped.notes = getVal(['notes']) || null;

  mapped.created_at = getVal(['createdAt', 'created_at']) || new Date().toISOString();
  mapped.updated_at = getVal(['updatedAt', 'updated_at']) || new Date().toISOString();
  mapped.jarayon_updated_at = getVal(['jarayonUpdatedAt', 'jarayon_updated_at']) || null;
  
  mapped.row_color = getVal(['rowColor', 'row_color']) || null;
  mapped.status_row_color = getVal(['statusRowColor', 'status_row_color']) || null;

  const tags = getVal(['taskTags', 'task_tags']);
  if (Array.isArray(tags)) mapped.task_tags = tags.map(String);
  else if (tags && typeof tags === 'string') mapped.task_tags = tags.split(',').map(t => t.trim()).filter(Boolean);
  else mapped.task_tags = [];

  mapped.pick_needed = getVal(['pickNeeded', 'pick_needed']) || [];
  mapped.has_mc = !!getVal(['hasMc', 'has_mc']);
  mapped.bc_hand_count = parseInt(getVal(['bcHandCount', 'bc_hand_count']) || 0, 10) || 0;
  mapped.mc_hand_count = parseInt(getVal(['mcHandCount', 'mc_hand_count']) || 0, 10) || 0;
  mapped.apos_hand_count = parseInt(getVal(['aposHandCount', 'apos_hand_count']) || 0, 10) || 0;
  mapped.pic_hand_count = parseInt(getVal(['picHandCount', 'pic_hand_count']) || 0, 10) || 0;
  mapped.is_deleted = !!getVal(['deleted', 'isDeleted', 'is_deleted']);

  return mapped;
}

// Sanitize & map payments
function sanitizePayment(raw, fsStudentMap) {
  const mapped = {};

  mapped.id = firestoreIdToUUID(raw.firestoreId);

  const amountVal = raw.amount !== undefined ? parseFloat(raw.amount) : 0;

  mapped.method = raw.method ? String(raw.method).trim() : 'Unknown';
  mapped.received_by = raw.receivedBy || raw.received_by || 'ADMIN';
  mapped.notes = raw.notes ? String(raw.notes).trim() : null;

  // robust mapping for is_discount & is_withdrawal
  const hasDiscountInNotes = raw.notes && raw.notes.toUpperCase().includes('DISCOUNT');
  mapped.is_discount = !!(raw.isDiscount || raw.is_discount || raw.type === 'discount' || hasDiscountInNotes || mapped.method === 'Discount');
  
  mapped.is_withdrawal = !!(raw.isWithdrawal || raw.is_withdrawal || amountVal < 0 || mapped.method === 'Withdrawal');

  // Enforce negative amount for withdrawal
  mapped.amount = mapped.is_withdrawal ? -Math.abs(amountVal) : Math.abs(amountVal);

  // Link to student: First map studentFirestoreId -> student.id (Supabase primary key)
  let studentCodeId = null;
  if (raw.studentFirestoreId && fsStudentMap.has(raw.studentFirestoreId)) {
    studentCodeId = fsStudentMap.get(raw.studentFirestoreId).id;
  } else {
    // fallback check: if studentId is present and directly exists in Supabase
    const sId = raw.studentId || raw.student_id;
    if (sId) {
      studentCodeId = String(sId).trim().toUpperCase();
    }
  }

  mapped.student_id = studentCodeId;
  mapped.student_name = raw.studentName || raw.student_name || null;
  if (mapped.student_name) {
    mapped.student_name = String(mapped.student_name).trim().toUpperCase();
  }

  mapped.created_at = raw.createdAt || raw.created_at || new Date().toISOString();
  mapped.updated_at = raw.updatedAt || raw.updated_at || mapped.created_at;

  return mapped;
}

async function run() {
  console.log('🔄 Loading data from Firestore REST API...');
  try {
    const [fsStudents, fsPayments] = await Promise.all([
      fetchFirestoreCollection('students'),
      fetchFirestoreCollection('payments')
    ]);

    console.log(`✅ Loaded ${fsStudents.length} students and ${fsPayments.length} payments from Firestore.`);

    // 1. Process and Clean Students
    const cleanedStudents = [];
    const fsStudentLookup = new Map(); // firestoreId -> clean student

    for (const doc of fsStudents) {
      const clean = sanitizeStudent(doc);
      if (clean) {
        cleanedStudents.push(clean);
        fsStudentLookup.set(doc.firestoreId, clean);
      }
    }

    // Deduplicate students by code ID (keeping most recently updated)
    const uniqueStudentsMap = new Map();
    for (const student of cleanedStudents) {
      if (uniqueStudentsMap.has(student.id)) {
        const existing = uniqueStudentsMap.get(student.id);
        const existingTime = new Date(existing.updated_at || 0).getTime();
        const newTime = new Date(student.updated_at || 0).getTime();
        if (newTime > existingTime) {
          uniqueStudentsMap.set(student.id, student);
        }
      } else {
        uniqueStudentsMap.set(student.id, student);
      }
    }

    const deduplicatedStudents = Array.from(uniqueStudentsMap.values());
    console.log(`🧹 Deduplicated students from ${cleanedStudents.length} to ${deduplicatedStudents.length} active records.`);

    // Check existing student IDs to validate payment refs
    const validStudentIdsSet = new Set(deduplicatedStudents.map(s => s.id));

    // 2. Process and Clean Payments
    const cleanedPayments = [];
    let orphanedCount = 0;

    for (const doc of fsPayments) {
      const clean = sanitizePayment(doc, fsStudentLookup);
      
      // Verify if the mapped student ID actually exists in our list
      if (clean.student_id && !validStudentIdsSet.has(clean.student_id)) {
        console.log(`⚠️ Warning: Mapped student ID "${clean.student_id}" for payment ${doc.firestoreId} does not exist in active students. Setting student_id to null.`);
        clean.student_id = null;
      }
      
      if (!clean.student_id) {
        orphanedCount++;
      }

      cleanedPayments.push(clean);
    }

    console.log(`🧹 Cleaned & Sanitized ${cleanedPayments.length} payments. Orphaned/unlinked payments: ${orphanedCount}`);

    // 3. Upsert into Supabase
    console.log(`📤 Upserting ${deduplicatedStudents.length} students to Supabase...`);
    const studentsRes = await supabase
      .from('students')
      .upsert(deduplicatedStudents, { onConflict: 'id' });

    if (studentsRes.error) {
      throw studentsRes.error;
    }
    console.log('✅ Students successfully upserted!');

    console.log(`📤 Upserting ${cleanedPayments.length} payments to Supabase (in batches)...`);
    const chunkSize = 50;
    let upsertedPayments = 0;

    for (let i = 0; i < cleanedPayments.length; i += chunkSize) {
      const chunk = cleanedPayments.slice(i, i + chunkSize);
      const { error: paymentsErr } = await supabase
        .from('payments')
        .upsert(chunk, { onConflict: 'id' });

      if (paymentsErr) throw paymentsErr;
      upsertedPayments += chunk.length;
      console.log(`   └─ Batch [${i + 1}-${i + chunk.length}] uploaded`);
    }

    console.log(`🎉 Migration completed successfully! Upserted ${deduplicatedStudents.length} students and ${upsertedPayments} payments.`);

  } catch (err) {
    console.error('❌ Migration failed:', err.message || err);
  }
}

run();
