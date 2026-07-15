import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ilzghipeqjfnunrznngn.supabase.co'
const supabaseKey = 'sb_publishable_kU3BWKbGrbhZFVY7AbNpmg_ldE8JWDE' // Using the publishable key from .env.local

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  const { data, error } = await supabase.from('students').select('*').limit(1)
  if (error) {
    console.error('Error fetching student:', error)
    return
  }
  if (data && data.length > 0) {
    console.log('Keys in student record:', Object.keys(data[0]).sort())
  } else {
    console.log('No student records found.')
  }
}

checkSchema()
