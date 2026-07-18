const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : null;

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

  console.log("\n=== Query 1: select('*') ===");
  const { data: s1, error: e1 } = await supabase.from('students').select('*').limit(1);
  if (e1) {
    console.error("Query 1 error:", e1);
  } else {
    console.log("Query 1 result:", s1);
  }

  console.log("\n=== Query 2: Fetch student then fetch creator separately ===");
  const { data: s2, error: e2 } = await supabase.from('students').select('*').limit(1);
  if (e2) {
    console.error("Query 2 student fetch error:", e2);
  } else if (s2 && s2.length > 0) {
    const student = s2[0];
    if (student.created_by) {
      console.log(`Student has created_by: ${student.created_by}. Fetching profile...`);
      const { data: creator, error: ce } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', student.created_by)
        .single();
      if (ce) {
        console.error("Error fetching creator profile:", ce);
      } else {
        student.creator = creator;
        console.log("Success! Full student data:", student);
      }
    } else {
      console.log("Student has no created_by field set.", student);
    }
  } else {
    console.log("No student records found to test with.");
  }
}

run();
