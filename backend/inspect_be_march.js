import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'March 2026 BE DHY (2).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['BE March 2026'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    console.log('--- BE March 2026 SHEET SAMPLE ---');
    rows.slice(0, 45).forEach((row, i) => {
        // filter out nulls at the end to make print clean
        const cleanRow = [];
        let nonNullSeen = false;
        for (let col = row.length - 1; col >= 0; col--) {
            if (row[col] !== null || nonNullSeen) {
                cleanRow.unshift(row[col]);
                nonNullSeen = true;
            }
        }
        console.log(`Row ${i+1}:`, cleanRow.slice(0, 15));
    });
}

run();
