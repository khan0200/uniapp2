/**
 * Standalone CLI Script: Migrate Firestore Payments to Supabase
 * Running instructions:
 *   node scripts/migrate-payments.js
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
const COLLECTION_NAME = 'payments';

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

// Convert Firestore ID to deterministic UUID
function firestoreIdToUUID(firestoreId) {
  const hash = crypto.createHash('sha1').update(firestoreId).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
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
    } else if (value.timestampValue !== undefined) {
      result[key] = value.timestampValue;
    }
  }

  const nameParts = doc.name.split('/');
  result.firestoreId = nameParts[nameParts.length - 1];
  return result;
}

// Sanitize & map payments to match Supabase database schema
function sanitizeRecord(raw, existingStudentIds) {
  const mapped = {};

  // Deterministic UUID
  mapped.id = firestoreIdToUUID(raw.firestoreId);

  // Amount
  const amountVal = raw.amount !== undefined ? parseFloat(raw.amount) : 0;
  mapped.amount = amountVal;

  // Method
  mapped.method = raw.method ? String(raw.method).trim() : 'Unknown';

  // Received By
  mapped.received_by = raw.receivedBy || raw.received_by || 'ADMIN';

  // Notes
  mapped.notes = raw.notes ? String(raw.notes).trim() : null;

  // Flags
  mapped.is_discount = !!(raw.isDiscount || raw.is_discount);
  mapped.is_withdrawal = !!(raw.isWithdrawal || raw.is_withdrawal || amountVal < 0 || mapped.method === 'Withdrawal');

  // Student details
  let sId = raw.studentId || raw.student_id;
  if (sId) {
    sId = String(sId).trim().toUpperCase();
    if (existingStudentIds.has(sId)) {
      mapped.student_id = sId;
    } else {
      mapped.student_id = null;
      console.log(`⚠️ Warning: Student ID "${sId}" for payment ${raw.firestoreId} does not exist in Supabase students table. Setting to null.`);
    }
  } else {
    mapped.student_id = null;
  }

  mapped.student_name = raw.studentName || raw.student_name || null;
  if (mapped.student_name) {
    mapped.student_name = String(mapped.student_name).trim().toUpperCase();
  }

  // Dates
  mapped.created_at = raw.createdAt || raw.created_at || new Date().toISOString();
  mapped.updated_at = raw.updatedAt || raw.updated_at || mapped.created_at;

  return mapped;
}

async function runMigration() {
  console.log('Fetching active student IDs from Supabase to validate references...');
  const { data: students, error: studentsErr } = await supabase
    .from('students')
    .select('id');

  if (studentsErr) {
    console.error('❌ Failed to fetch students from Supabase:', studentsErr);
    process.exit(1);
  }

  const existingStudentIds = new Set(students.map(s => s.id));
  console.log(`Loaded ${existingStudentIds.size} student IDs.`);

  console.log(`📡 Fetching from Firestore collection "${COLLECTION_NAME}"...`);
  
  try {
    let pageToken = '';
    let allDocuments = [];
    
    do {
      let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${COLLECTION_NAME}?pageSize=1000`;
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`REST API fetch failed with status ${res.status}`);
      }

      const data = await res.json();
      const docs = data.documents || [];
      allDocuments = allDocuments.concat(docs);
      pageToken = data.nextPageToken || '';
      console.log(`   └─ Fetched batch, total so far: ${allDocuments.length}`);
    } while (pageToken);

    console.log(`✅ Fetched ${allDocuments.length} raw payment documents from Firestore.`);

    const cleanedPayments = [];
    for (const doc of allDocuments) {
      const raw = convertFirestoreRestDoc(doc);
      const clean = sanitizeRecord(raw, existingStudentIds);
      if (clean) {
        cleanedPayments.push(clean);
      }
    }

    console.log(`🧹 Cleaned & Sanitized ${cleanedPayments.length} payment records.`);
    
    if (cleanedPayments.length === 0) {
      console.log('⚠️ No valid payment records to migrate.');
      return;
    }

    console.log(`📤 Upserting ${cleanedPayments.length} records into Supabase "payments" table...`);

    // Bulk upsert chunks of 50
    const chunkSize = 50;
    let upsertCount = 0;

    for (let i = 0; i < cleanedPayments.length; i += chunkSize) {
      const chunk = cleanedPayments.slice(i, i + chunkSize);
      const { error } = await supabase
        .from('payments')
        .upsert(chunk, { onConflict: 'id' });

      if (error) throw error;
      upsertCount += chunk.length;
      console.log(`   └─ Batch [${i + 1}-${i + chunk.length}] uploaded`);
    }

    console.log(`🎉 Payments Migration completed successfully! Uploaded ${upsertCount} records.`);
  } catch (err) {
    console.error('❌ Migration failed:', err.message || err);
  }
}

runMigration();
