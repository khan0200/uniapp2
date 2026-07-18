const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : null;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Signing in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'sodiq@gmail.com',
    password: '00880088'
  });

  if (authError) {
    console.error("Sign in failed:", authError.message);
    process.exit(1);
  }

  console.log("Successfully signed in!");

  // Query RPC or system table views (note: Postgres exposes some user_views/tables if public)
  // Let's try fetching the definitions from information_schema.columns
  const { data: cols, error: err } = await supabase
    .from('students')
    .select('id')
    .limit(1);
  
  // Since we can't query information_schema directly via normal postgrest unless it's configured,
  // let's try querying information_schema via a trick or check what the default values are in error messages.
  // Wait, let's write a script that attempts to create a row in tariff_options and payment_methods
  // WITHOUT tenant_id, and prints the exact error. Then try WITH tenant_id.
  console.log("\n=== Test insert to payment_methods without tenant_id ===");
  const { data: pm1, error: pme1 } = await supabase.from('payment_methods').insert({ name: 'TEST_PM_NO_TENANT' }).select('*');
  console.log("Error:", pme1);
  console.log("Result:", pm1);

  console.log("\n=== Test insert to payment_methods WITH tenant_id ===");
  const { data: pm2, error: pme2 } = await supabase.from('payment_methods').insert({ name: 'TEST_PM_WITH_TENANT', tenant_id: 'sodiq' }).select('*');
  console.log("Error:", pme2);
  console.log("Result:", pm2);

  // Clean up if inserted
  if (pm2 && pm2[0]) {
    await supabase.from('payment_methods').delete().eq('id', pm2[0].id);
  }
}

run();
