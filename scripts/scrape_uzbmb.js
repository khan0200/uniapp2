const fs = require('fs');
const https = require('https');

function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
    });
}

async function scrape() {
    console.log("Fetching university lists...");
    const urls = ['https://my.uzbmb.uz/university/1', 'https://my.uzbmb.uz/university/2'];
    const universityLinks = [];

    for (const url of urls) {
        const html = await fetchHtml(url);
        // regex to find all a href="/university-about-direction/301"
        const regex = /href="\/university-about-direction\/(\d+)"/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            universityLinks.push(match[1]);
        }
    }

    // deduplicate
    const uniqueIds = [...new Set(universityLinks)];
    console.log(`Found ${uniqueIds.length} unique universities.`);

    const results = [];
    let count = 0;

    for (const id of uniqueIds) {
        const url = `https://my.uzbmb.uz/university-about-direction/${id}`;
        try {
            const html = await fetchHtml(url);
            
            // Extract Name
            const nameMatch = html.match(/<h1>(.*?)<\/h1>/);
            const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

            // Extract contact div
            const contactMatch = html.match(/class="bd-about-university-contact">([\s\S]*?)<\/div>/);
            let phone = '', email = '', website = '', address = '';

            if (contactMatch) {
                const spans = [...contactMatch[1].matchAll(/<span>([\s\S]*?)<\/span>/g)].map(m => m[1].replace(/&nbsp;/g, ' ').trim());
                
                for (const span of spans) {
                    if (span.includes('Telefon raqam:')) phone = span.replace('Telefon raqam:', '').trim();
                    else if (span.includes('Pochta manzil:')) email = span.replace('Pochta manzil:', '').trim();
                    else if (span.includes('Web sayt:')) website = span.replace('Web sayt:', '').trim();
                    else if (span.length > 5) address = span; // Assuming the last long span without a prefix is the address
                }
            }

            results.push({ id, name, phone, email, website, address });
            count++;
            if (count % 10 === 0) console.log(`Processed ${count}/${uniqueIds.length}`);
        } catch (err) {
            console.log(`Error fetching ID ${id}: ${err.message}`);
        }
    }

    fs.writeFileSync('scraped_universities.json', JSON.stringify(results, null, 2));
    console.log('Done! Saved to scraped_universities.json');
}

scrape();
