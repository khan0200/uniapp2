const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Signing in as sodiq@gmail.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'sodiq@gmail.com',
    password: '00880088'
  });

  if (authError) {
    console.error("Sign in failed:", authError.message);
    process.exit(1);
  }

  console.log("Successfully signed in!");

  console.log("\n=== Fetching all students ===");
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('*');

  if (studentError) {
    console.error("Error fetching students:", studentError.message);
  } else {
    console.log(`Total students fetched: ${students.length}`);
    console.log("Students details:", students.map(s => ({ id: s.id, full_name: s.full_name, is_deleted: s.is_deleted, folder_ids: s.folder_ids })));
  }
}

run();
