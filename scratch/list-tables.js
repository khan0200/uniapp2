const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseKey = keyMatch ? keyMatch[1].trim() : null;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Try calling a system query or testing known endpoints
  const tables = [
    'profiles', 'students', 'payments', 
    'offices', 'payment_methods', 'payment_receivers', 'payment_note_templates', 'university_statuses',
    'coordinators', 'folders', 'tariff_options', 'education_levels', 'student_groups', 'lead_sources', 'universities'
  ];

  console.log("Checking table existence and RLS...");
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table '${table}': ERROR/BLOCKED - ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`Table '${table}': SUCCESS - Row count fetched: ${data.length}`);
    }
  }
}

run();
