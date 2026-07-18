const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : null;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Signing in as Sodiq...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'sodiq@gmail.com',
    password: '00880088'
  });

  if (authError) {
    console.error("Sign in failed:", authError.message);
    process.exit(1);
  }

  console.log("Successfully signed in!");

  console.log("\n=== Test insert to payments without tenant_id/created_by ===");
  const { data: p1, error: pe1 } = await supabase.from('payments').insert({
    amount: 1000,
    method: 'Naqd',
    received_by: 'Discount',
    notes: 'TEST PAYMENT',
    is_discount: true,
    is_withdrawal: false
  }).select('*');
  console.log("Error:", pe1);
  console.log("Result:", p1);

  if (p1 && p1[0]) {
    // clean up
    await supabase.from('payments').delete().eq('id', p1[0].id);
  }
}

run();
