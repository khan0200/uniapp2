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
  console.log("Authenticated User ID:", authData.user.id);

  console.log("\n=== Checking Profile ===");
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileErr) {
    console.error("Error fetching profile:", profileErr.message);
  } else {
    console.log("Profile:", profile);
  }

  console.log("\n=== Checking Tariff Options visible to Sodiq ===");
  const { data: tariffs, error: tariffErr } = await supabase.from('tariff_options').select('*');
  if (tariffErr) {
    console.error("Error fetching tariffs:", tariffErr.message);
  } else {
    console.log("Tariffs count:", tariffs.length);
    console.log("Tariff list:", tariffs);
  }

  console.log("\n=== Checking Education Levels visible to Sodiq ===");
  const { data: levels, error: levelErr } = await supabase.from('education_levels').select('*');
  if (levelErr) {
    console.error("Error fetching levels:", levelErr.message);
  } else {
    console.log("Levels count:", levels.length);
    console.log("Level list:", levels);
  }
}

run();
