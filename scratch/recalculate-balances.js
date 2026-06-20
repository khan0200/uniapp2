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

const TARIFF_PRICES = {
  'STANDART': 13000000,
  'PREMIUM': 32500000,
  'VISA PLUS': 65000000,
  'E-VISA (TIL SERTIFIKATISIZ)': 24000000,
  'E-VISA (TIL SERTIFIKATLI)': 16000000,
  'REGIONAL VISA': 2000000,
  'ZERO RISK': 18500000,
  'E-VISA': 2000000,
};

const getTariffPrice = (tariff, languageCertificate) => {
  if (!tariff) return 0;
  if (tariff === 'E-VISA') {
    const hasCert = languageCertificate && languageCertificate !== 'NO CERTIFICATE';
    return hasCert ? 16000000 : 24000000;
  }
  return TARIFF_PRICES[tariff] || 0;
};

async function run() {
  console.log("Fetching students and payments...");
  const [studentsRes, paymentsRes] = await Promise.all([
    supabase.from('students').select('*'),
    supabase.from('payments').select('*')
  ]);

  if (studentsRes.error) {
    console.error("Error fetching students:", studentsRes.error);
    return;
  }
  if (paymentsRes.error) {
    console.error("Error fetching payments:", paymentsRes.error);
    return;
  }

  const students = studentsRes.data;
  const payments = paymentsRes.data;

  console.log(`Loaded ${students.length} students and ${payments.length} payments.`);

  let fixCount = 0;

  for (const student of students) {
    // Sum all payments for this student
    const studentPayments = payments.filter(p => p.student_id === student.id);
    const totalPaymentsSum = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Calculate correct balance
    const tariffPrice = getTariffPrice(student.tariff, student.language_certificate);
    const calculatedBalance = totalPaymentsSum - tariffPrice;

    const storedBalance = student.balance || 0;

    if (calculatedBalance !== storedBalance) {
      console.log(`Mismatch for ${student.full_name} (${student.id}): Stored: ${storedBalance}, Calculated: ${calculatedBalance} (Diff: ${calculatedBalance - storedBalance})`);
      
      const { error: updateError } = await supabase
        .from('students')
        .update({ balance: calculatedBalance })
        .eq('id', student.id);

      if (updateError) {
        console.error(`Failed to update student ${student.id}:`, updateError);
      } else {
        fixCount++;
      }
    }
  }

  console.log(`Finished recalculation. Corrected balance for ${fixCount} students.`);
}

run();
