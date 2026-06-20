const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : null;
const supabaseAnonKey = keyMatch ? keyMatch[1].trim() : null;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data: data1, error: err1 } = await supabase.from('tariffs').select('*');
  console.log("tariffs:", data1, err1);
  const { data: data2, error: err2 } = await supabase.from('tariff_options').select('*');
  console.log("tariff_options:", data2, err2);
}

run();
