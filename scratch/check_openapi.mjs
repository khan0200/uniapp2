async function checkOpenAPI() {
  const url = 'https://ilzghipeqjfnunrznngn.supabase.co/rest/v1/?apikey=sb_publishable_kU3BWKbGrbhZFVY7AbNpmg_ldE8JWDE'
  try {
    const res = await fetch(url)
    const data = await res.json()
    console.log('Available definitions in Supabase schema:', Object.keys(data.definitions || {}));
  } catch (err) {
    console.error('Error fetching OpenAPI spec:', err)
  }
}

checkOpenAPI()
