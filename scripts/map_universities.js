const fs = require('fs');

const mdContent = fs.readFileSync('C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\50d1dddf-25b9-4866-b2e4-24b58ded8a34\\universities_list.md', 'utf8');
const jsonStr = mdContent.split('```json')[1].split('```')[0];
const englishNames = JSON.parse(jsonStr);
const scrapedData = JSON.parse(fs.readFileSync('scraped_universities.json', 'utf8'));

let openaiKey = process.env.OPENAI_API_KEY || '';
if (!openaiKey) {
    const envLocal = fs.readFileSync('.env.local', 'utf8');
    const match = envLocal.match(/OPENAI_API_KEY=(.*)/);
    if(match) openaiKey = match[1].trim();
}

async function run() {
    console.log('Mapping', englishNames.length, 'English names to', scrapedData.length, 'scraped records.');

    const chunkSize = 40;
    const allMatches = [];

    for (let i = 0; i < englishNames.length; i += chunkSize) {
        const chunk = englishNames.slice(i, i + chunkSize);
        console.log(`Processing chunk ${i} to ${i + chunk.length}...`);

        const prompt = `
        I have a list of English university names and a list of scraped data (Uzbek).
        Please map each English university to the correct scraped ID.
        If you cannot find a match, use id: null.

        English names to map:
        ${JSON.stringify(chunk, null, 2)}

        Scraped data available:
        ${JSON.stringify(scrapedData.map(s => ({id: s.id, name: s.name})), null, 2)}

        Return ONLY a raw JSON array of objects with format:
        [
            { "english_name": "NAME", "scraped_id": "ID" }, ...
        ]
        `;

        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0,
                })
            });
            const jsonRes = await res.json();
            if(jsonRes.error) {
               console.error(jsonRes.error);
               continue;
            }
            
            const content = jsonRes.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
            const matches = JSON.parse(content);
            allMatches.push(...matches);
        } catch (err) {
            console.error('Error during LLM call:', err.message);
        }
    }

    console.log('Generating SQL...');
    let sql = 'INSERT INTO schools (name, address, website, phone, email, source) VALUES\n';
    
    const values = [];
    for (const match of allMatches) {
        const scraped = scrapedData.find(s => s.id === match.scraped_id);
        const name = match.english_name.replace(/'/g, "''");
        
        let address = 'NULL', website = 'NULL', phone = 'NULL', email = 'NULL';
        if (scraped && scraped.name !== 'Unknown') {
            if (scraped.address) address = `'${scraped.address.replace(/'/g, "''")}'`;
            if (scraped.website) website = `'${scraped.website.replace(/'/g, "''")}'`;
            if (scraped.phone) phone = `'${scraped.phone.replace(/'/g, "''")}'`;
            if (scraped.email) email = `'${scraped.email.replace(/'/g, "''")}'`;
        }

        values.push(`  ('${name}', ${address}, ${website}, ${phone}, ${email}, 'seed')`);
    }

    sql += values.join(',\n');
    sql += '\nON CONFLICT (name) DO UPDATE SET\n';
    sql += '  address = EXCLUDED.address,\n';
    sql += '  website = EXCLUDED.website,\n';
    sql += '  phone = EXCLUDED.phone,\n';
    sql += '  email = EXCLUDED.email,\n';
    sql += '  source = EXCLUDED.source,\n';
    sql += '  updated_at = NOW();\n';

    fs.writeFileSync('supabase/migrations/20260803030000_seed_all_schools.sql', sql, 'utf8');
    console.log('Migration generated successfully: supabase/migrations/20260803030000_seed_all_schools.sql');
}

run();
