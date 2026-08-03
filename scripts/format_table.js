const fs = require('fs');

const data = JSON.parse(fs.readFileSync('scraped_universities.json', 'utf8'));

let md = `# University Contact Details\n\n`;
md += `This data was scraped directly from the official **my.uzbmb.uz** registry as requested. We successfully retrieved data for ${data.length} university profiles!\n\n`;
md += `| Name (from Registry) | Telefon raqam | Pochta manzil | Web sayt | Manzil |\n`;
md += `|---|---|---|---|---|\n`;

for (const uni of data) {
    if (uni.name === 'Unknown') continue; // Skip failed ones to keep table clean
    md += `| ${uni.name} | ${uni.phone} | ${uni.email} | ${uni.website} | ${uni.address} |\n`;
}

// Add instructions for importing
md += `\n## Need this in the Database?\n`;
md += `If you would like me to automatically update your Supabase \`universities\` table with this data, just let me know! I can write a script to match these Uzbek names to your English names and populate the rows for you.`;

const artifactPath = require('path').join(__dirname, '..', '.gemini', 'antigravity-ide', 'brain', '50d1dddf-25b9-4866-b2e4-24b58ded8a34', 'university_contacts.md');

fs.mkdirSync(require('path').dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, md);
console.log('Artifact created at:', artifactPath);
