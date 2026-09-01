import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'March 2026 BE DHY (2).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Daily Update'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    console.log('--- DAILY UPDATE SHEET ---');
    rows.slice(0, 35).forEach((row, i) => {
        console.log(`Row ${i+1}:`, row.slice(0, 10));
    });
}

run();
