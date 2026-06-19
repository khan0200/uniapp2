const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const supabase = createClient(supabaseUrl, supabaseKey);
const FIREBASE_PROJECT_ID = 'unibridge-7d530';

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
      result[key] = value.mapValue.fields;
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

async function fetchFirestoreStudents() {
  let pageToken = '';
  let allDocuments = [];
  
  do {
    let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/students?pageSize=1000`;
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
  } while (pageToken);

  return allDocuments.map(convertFirestoreRestDoc);
}

async function run() {
  try {
    console.log('🔄 Fetching from Firestore...');
    const fsStudents = await fetchFirestoreStudents();
    console.log(`Loaded ${fsStudents.length} students from Firestore.`);

    console.log('🔄 Fetching from Supabase...');
    const { data: sbStudents, error: sbError } = await supabase
      .from('students')
      .select('id, full_name, balance, discount, is_deleted');

    if (sbError) throw sbError;
    console.log(`Loaded ${sbStudents.length} students from Supabase.`);
    console.log('Sample Supabase students (first 5):', sbStudents.slice(0, 5));

    // Match by ID
    const sbStudentMap = new Map();
    sbStudents.forEach(s => {
      sbStudentMap.set(s.id, s);
    });

    const discrepancies = [];
    let matchCount = 0;
    let missingCount = 0;

    fsStudents.forEach(fsStudent => {
      const id = fsStudent.id ? String(fsStudent.id).trim().toUpperCase() : '';
      if (!id) return; // skip if student has no ID in Firestore

      const sbStudent = sbStudentMap.get(id);

      if (!sbStudent) {
        missingCount++;
        // If not in Supabase, check if deleted
        if (!fsStudent.deleted && !fsStudent.isDeleted) {
          console.log(`⚠️ Active student in Firestore is missing in Supabase: ID: ${id}, Name: ${fsStudent.fullName}`);
        }
        return;
      }

      const fsBalance = parseFloat(fsStudent.balance) || 0;
      const sbBalance = parseFloat(sbStudent.balance) || 0;
      const fsDiscount = parseFloat(fsStudent.discount) || 0;
      const sbDiscount = parseFloat(sbStudent.discount) || 0;

      const balanceDiff = fsBalance - sbBalance;
      const discountDiff = fsDiscount - sbDiscount;

      if (balanceDiff !== 0 || discountDiff !== 0) {
        discrepancies.push({
          id,
          name: fsStudent.fullName,
          fsBalance,
          sbBalance,
          balanceDiff,
          fsDiscount,
          sbDiscount,
          discountDiff
        });
      } else {
        matchCount++;
      }
    });

    console.log(`\n--- Comparison Summary ---`);
    console.log(`Perfect matches (Balance & Discount): ${matchCount}`);
    console.log(`Students with financial discrepancies: ${discrepancies.length}`);
    console.log(`Firestore student IDs not found in Supabase: ${missingCount}`);

    if (discrepancies.length > 0) {
      console.log('\n--- Discrepancies details ---');
      discrepancies.forEach(d => {
        console.log(`ID: ${d.id} | Name: ${d.name}`);
        if (d.balanceDiff !== 0) {
          console.log(`  └─ Balance: Firestore = ${d.fsBalance.toLocaleString()}, Supabase = ${d.sbBalance.toLocaleString()} (diff: ${d.balanceDiff.toLocaleString()})`);
        }
        if (d.discountDiff !== 0) {
          console.log(`  └─ Discount: Firestore = ${d.fsDiscount.toLocaleString()}, Supabase = ${d.sbDiscount.toLocaleString()} (diff: ${d.discountDiff.toLocaleString()})`);
        }
      });
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
