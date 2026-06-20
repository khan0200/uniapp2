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

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Testing RPC call...');
  const { data, error } = await supabase.rpc('create_new_user', {
    p_email: 'test_rpc@example.com',
    p_password: 'Password123!',
    p_full_name: 'TEST RPC USER',
    p_role: 'Admin'
  });

  console.log('Data:', data);
  console.log('Error:', error);
}

run();
