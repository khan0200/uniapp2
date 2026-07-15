import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ilzghipeqjfnunrznngn.supabase.co'
const supabaseKey = 'sb_publishable_kU3BWKbGrbhZFVY7AbNpmg_ldE8JWDE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInsert() {
  const { data, error } = await supabase.from('students').insert({
    id: 'DIAGNOSTIC_TEST',
    full_name: 'DIAGNOSTIC TEST',
    invoice: 'Test',
    coa: 'Test',
    embassy: 'Test'
  }).select()
  
  if (error) {
    console.log('Database returned error code:', error.code)
    console.log('Database error message:', error.message)
    console.log('Database details:', error.details)
  } else {
    console.log('Insert succeeded! Data:', data)
    // Clean up
    await supabase.from('students').delete().eq('id', 'DIAGNOSTIC_TEST')
  }
}

testInsert()
