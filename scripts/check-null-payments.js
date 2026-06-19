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

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL or Anon Key not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  try {
    const { data: nullPayments, error } = await supabase
      .from('payments')
      .select('*')
      .is('student_id', null);

    if (error) throw error;

    console.log(`Found ${nullPayments.length} payments with null student_id in Supabase.`);
    
    // Group by student name
    const grouped = {};
    nullPayments.forEach(p => {
      const name = p.student_name || 'General Payment';
      if (!grouped[name]) grouped[name] = [];
      grouped[name].push(p);
    });

    console.log('\n--- Orphaned Payments by Student Name ---');
    for (const [name, list] of Object.entries(grouped)) {
      const totalAmount = list.reduce((sum, p) => sum + Number(p.amount), 0);
      console.log(`- ${name}: ${list.length} payments, total: ${totalAmount.toLocaleString()} UZS`);
      list.forEach(p => {
        console.log(`  └─ ID: ${p.id}, amount: ${p.amount}, method: ${p.method}, notes: ${p.notes}, created_at: ${p.created_at}`);
      });
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

run();
