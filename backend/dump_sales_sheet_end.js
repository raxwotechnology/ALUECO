import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'March 2026 BE DHY (2).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Sales'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    console.log('--- SALES SHEET (Row 36 onwards) ---');
    rows.slice(35, 100).forEach((row, i) => {
        // filter out nulls at the end
        const cleanRow = [];
        let nonNullSeen = false;
        for (let col = row.length - 1; col >= 0; col--) {
            if (row[col] !== null || nonNullSeen) {
                cleanRow.unshift(row[col]);
                nonNullSeen = true;
            }
        }
        if (cleanRow.length > 0) {
            console.log(`Row ${i+36}:`, cleanRow.slice(0, 15));
        }
    });
}

run();
