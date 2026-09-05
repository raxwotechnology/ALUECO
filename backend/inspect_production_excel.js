import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs-extra';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'DHY Production - New Link (3).xlsx');
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found`);
        return;
    }
    const workbook = xlsx.readFile(filePath, { cellDates: true });
    
    console.log('--- PRODUCTION SUMMARY SHEET ---');
    const prodSheet = workbook.Sheets['Production summary'];
    const prodRows = xlsx.utils.sheet_to_json(prodSheet, { header: 1, defval: null });
    console.log('Total rows:', prodRows.length);
    prodRows.slice(0, 15).forEach((row, i) => {
        console.log(`Row ${i+1}:`, row.slice(0, 10));
    });

    console.log('\n--- DAILY PURCHUS SHEET ---');
    const purSheet = workbook.Sheets['Daily purchus'];
    const purRows = xlsx.utils.sheet_to_json(purSheet, { header: 1, defval: null });
    console.log('Total rows:', purRows.length);
    purRows.slice(0, 15).forEach((row, i) => {
        console.log(`Row ${i+1}:`, row.slice(0, 10));
    });

    console.log('\n--- STOCK IN HAND SHEET ---');
    const stockSheet = workbook.Sheets['Stock in hand'];
    const stockRows = xlsx.utils.sheet_to_json(stockSheet, { header: 1, defval: null });
    console.log('Total rows:', stockRows.length);
    stockRows.slice(0, 15).forEach((row, i) => {
        console.log(`Row ${i+1}:`, row.slice(0, 10));
    });
}

run();
