const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const serviceRoleMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/) || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseKey = serviceRoleMatch ? serviceRoleMatch[1].trim() : null;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("=== Fetching some students ===");
  const { data: students, error: studentError } = await supabase.from('students').select('id, full_name, lead_by').limit(5);
  if (studentError) {
    console.error("Error fetching students:", studentError);
  } else {
    console.log("Students:", students);
  }

  console.log("\n=== Unique lead_by values ===");
  const { data: allLeads, error: leadsError } = await supabase.from('students').select('lead_by');
  if (leadsError) {
    console.error("Error fetching lead_by:", leadsError);
  } else {
    const uniqueLeads = [...new Set(allLeads.map(s => s.lead_by))];
    console.log("Unique leads:", uniqueLeads);
  }

  console.log("\n=== Fetching profiles ===");
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id, full_name, email, role');
  if (profileError) {
    console.error("Error fetching profiles:", profileError);
  } else {
    console.log("Profiles:", profiles);
  }
}

run();
