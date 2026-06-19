const XLSX = require('xlsx');

const file = "c:\\Users\\User\\Desktop\\Students_All_2026-06-19.xlsx";
const workbook = XLSX.readFile(file);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

if (data.length > 0) {
  console.log("HEADERS:");
  const headers = Object.keys(data[0]);
  console.log(JSON.stringify(headers, null, 2));
  console.log("\nFIRST ROW VALUES:");
  console.log(JSON.stringify(data[0], null, 2));
} else {
  console.log("No data found in sheet!");
}
