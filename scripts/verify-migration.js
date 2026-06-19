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

async function fetchFirestoreCollection(collection) {
  let pageToken = '';
  let allDocuments = [];
  
  do {
    let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collection}?pageSize=1000`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`REST API fetch failed for ${collection} with status ${res.status}`);
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
    console.log('🔄 Fetching students from Firestore...');
    const fsStudents = await fetchFirestoreCollection('students');

    console.log(`✅ Loaded ${fsStudents.length} students from Firestore.`);

    // Check for duplicate custom ID fields
    const idMap = new Map(); // id (upper) -> list of students
    fsStudents.forEach(s => {
      const codeId = s.id ? String(s.id).trim().toUpperCase() : '(EMPTY)';
      if (!idMap.has(codeId)) {
        idMap.set(codeId, []);
      }
      idMap.get(codeId).push(s);
    });

    console.log('\n--- Analyzing Duplicate IDs in Firestore ---');
    let totalDuplicatesCount = 0;
    for (const [codeId, list] of idMap.entries()) {
      if (list.length > 1) {
        console.log(`ID "${codeId}" has ${list.length} duplicates:`);
        list.forEach(s => {
          console.log(`  - name: ${s.fullName}, firestoreId: ${s.firestoreId}, isDeleted: ${s.deleted || s.isDeleted || false}, updatedAt: ${s.updatedAt}`);
        });
        totalDuplicatesCount += (list.length - 1);
      }
    }
    console.log(`Total duplicate student records that would be discarded by ID deduplication: ${totalDuplicatesCount}`);

  } catch (err) {
    console.error('Error during verification:', err);
  }
}

run();
