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

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log("Usage: node scratch/test-tenant-isolation.js <manager-email> <manager-password>");
    console.log("\nNote: Please execute supabase/add_tenant_id_and_user_isolation.sql in your Supabase SQL editor first.");
    process.exit(0);
  }

  const [email, password] = args;
  console.log(`Attempting to sign in as ${email}...`);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (authError) {
    console.error("Authentication failed:", authError.message);
    process.exit(1);
  }

  console.log("Successfully authenticated!");
  const user = authData.user;
  
  // 1. Fetch current profile to verify tenant and role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error("Error fetching profile:", profileError.message);
    process.exit(1);
  }

  console.log("\n=== Authenticated Profile Details ===");
  console.log(`Name: ${profile.full_name}`);
  console.log(`Role: ${profile.role}`);
  console.log(`Tenant ID: ${profile.tenant_id}`);

  // 2. Fetch students and verify RLS filtering
  console.log("\n=== Fetching Students (enforcing RLS) ===");
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, full_name, tenant_id, created_by')
    .limit(10);

  if (studentError) {
    console.error("Error fetching students:", studentError.message);
  } else {
    console.log(`Fetched ${students.length} students:`);
    students.forEach(s => {
      console.log(` - ID: ${s.id}, Name: ${s.full_name}, Tenant: ${s.tenant_id}, Creator: ${s.created_by}`);
      if (s.tenant_id !== profile.tenant_id) {
        console.error(`❌ Security breach! Student ${s.id} belongs to tenant ${s.tenant_id} but was seen by user of tenant ${profile.tenant_id}`);
      }
    });
  }

  // 3. Test insert auto-population via trigger
  console.log("\n=== Testing Student Insert (Trigger check) ===");
  const tempId = 'T' + Math.floor(100 + Math.random() * 900);
  const tempName = 'TEST STUDENT ' + tempId;
  const { data: newStudent, error: insertError } = await supabase
    .from('students')
    .insert({
      id: tempId,
      full_name: tempName,
      university_1_status: 'Chosen'
    })
    .select('*')
    .single();

  if (insertError) {
    console.error("Error inserting student:", insertError.message);
  } else {
    console.log("Successfully inserted student!");
    console.log(` - ID: ${newStudent.id}`);
    console.log(` - Auto-assigned Tenant ID: ${newStudent.tenant_id}`);
    console.log(` - Auto-assigned Creator ID: ${newStudent.created_by}`);

    // Clean up
    console.log("\nCleaning up inserted student...");
    const { error: deleteError } = await supabase
      .from('students')
      .delete()
      .eq('id', tempId);
    if (deleteError) {
      console.error("Error deleting student:", deleteError.message);
    } else {
      console.log("Cleaned up successfully.");
    }
  }
}

run();
