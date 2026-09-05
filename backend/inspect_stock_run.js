import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'DHY Production - New Link (3).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Stock in hand'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headers = rows[1];
    
    console.log(`Headers:`, headers);
    
    for (let i = 550; i <= 570; i++) {
        const row = rows[i];
        if (!row) continue;
        console.log(`\nRow ${i+1} [Date: ${row[1]}, Product: ${row[2]}]:`);
        headers.forEach((h, colIdx) => {
            const val = row[colIdx];
            if (val !== null && val !== undefined && val !== '') {
                console.log(`  - ${h}: ${val}`);
            }
        });
    }
}

run();
