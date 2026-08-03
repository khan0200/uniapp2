const fs = require('fs');

let openaiKey = process.env.OPENAI_API_KEY || '';
if (!openaiKey) {
    const envLocal = fs.readFileSync('.env.local', 'utf8');
    const match = envLocal.match(/OPENAI_API_KEY=(.*)/);
    if(match) openaiKey = match[1].trim();
}

async function run() {
    const sqlContent = fs.readFileSync('supabase/migrations/20260803030000_seed_all_schools.sql', 'utf8');
    
    // Parse the values lines
    const lines = sqlContent.split('\n');
    const records = [];
    
    for (const line of lines) {
        if (!line.trim().startsWith('(')) continue;
        if (line.includes('EXCLUDED.')) continue;
        
        // basic parser
        const str = line.trim().replace(/^/, '').replace(/,$/, '');
        // format is: ('name', 'address'|NULL, 'website'|NULL, 'phone'|NULL, 'email'|NULL, 'seed')
        // Using a regex to extract these properly considering single quotes and escaped quotes is hard.
        // Let's use a simple regex split:
        const parts = str.match(/(?:'((?:[^']|'')*)'|NULL)/g);
        if (!parts || parts.length < 5) continue;
        
        const name = parts[0].replace(/'/g, '').replace(/''/g, "'");
        const address = parts[1] === 'NULL' ? null : parts[1].replace(/^'/, '').replace(/'$/, '').replace(/''/g, "'");
        const phone = parts[3] === 'NULL' ? null : parts[3].replace(/^'/, '').replace(/'$/, '').replace(/''/g, "'");
        
        records.push({ name, address, phone });
    }

    console.log(`Found ${records.length} records. Modifying addresses and phones...`);

    const addressesToTranslate = [...new Set(records.map(r => r.address).filter(a => a))];
    console.log(`Translating ${addressesToTranslate.length} unique addresses...`);

    const chunkSize = 40;
    const translationMap = {};

    for (let i = 0; i < addressesToTranslate.length; i += chunkSize) {
        const chunk = addressesToTranslate.slice(i, i + chunkSize);
        console.log(`Translating chunk ${i} to ${i + chunk.length}...`);

        const prompt = `
        You are a translator. Translate the following Uzbek addresses into English. 
        Return ONLY a raw JSON object where keys are the original Uzbek address and values are the English translation in ALL CAPS.
        Do not add any markdown blocks or explanations.
        
        Addresses:
        ${JSON.stringify(chunk, null, 2)}
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
            const translated = JSON.parse(content);
            Object.assign(translationMap, translated);
        } catch (err) {
            console.error('Error during LLM call:', err.message);
        }
    }

    console.log('Generating UPDATE SQL...');
    let sql = '-- Update existing schools with uppercase English addresses and formatted phones\n\n';
    
    for (const record of records) {
        let updatedAddress = record.address ? translationMap[record.address] || record.address.toUpperCase() : null;
        let updatedPhone = record.phone;

        if (updatedPhone) {
            // Remove all non-numeric characters for processing
            let digits = updatedPhone.replace(/\D/g, '');
            if (digits.length === 9) {
                // e.g., 742000025 -> +998 74 200 00 25
                updatedPhone = `+998 ${digits.slice(0,2)} ${digits.slice(2,5)} ${digits.slice(5,7)} ${digits.slice(7,9)}`;
            } else if (digits.length === 12 && digits.startsWith('998')) {
                // e.g. 998742238814 -> +998 74 223 88 14
                updatedPhone = `+${digits.slice(0,3)} ${digits.slice(3,5)} ${digits.slice(5,8)} ${digits.slice(8,10)} ${digits.slice(10,12)}`;
            } else {
                // Just prepend + if it doesn't have it and seems like a full country code
                if (!updatedPhone.startsWith('+') && updatedPhone.replace(/\D/g, '').length >= 10) {
                    updatedPhone = '+' + updatedPhone.replace(/^\+/, '');
                }
            }
        }

        if (updatedAddress || updatedPhone) {
            const safeName = record.name.replace(/'/g, "''");
            const addrSql = updatedAddress ? `'${updatedAddress.replace(/'/g, "''")}'` : 'address'; // keep old if null
            const phoneSql = updatedPhone ? `'${updatedPhone.replace(/'/g, "''")}'` : 'phone';
            
            sql += `UPDATE schools SET address = ${addrSql}, phone = ${phoneSql} WHERE name = '${safeName}';\n`;
        }
    }

    fs.writeFileSync('supabase/update_schools_contacts.sql', sql, 'utf8');
    console.log('Migration generated successfully: supabase/update_schools_contacts.sql');
}

run();
