import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'P&L.xlsx');
    const workbook = xlsx.readFile(filePath);
    
    for (const sheetName of workbook.SheetNames) {
        console.log(`\n--- P&L SHEET: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
        rows.slice(0, 35).forEach((row, i) => {
            const cleanRow = [];
            let nonNullSeen = false;
            for (let col = row.length - 1; col >= 0; col--) {
                if (row[col] !== null && row[col] !== '') {
                    nonNullSeen = true;
                }
                if (nonNullSeen) {
                    cleanRow.unshift(row[col]);
                }
            }
            if (cleanRow.length > 0) {
                console.log(`Row ${i+1}:`, cleanRow.slice(0, 10));
            }
        });
    }
}

run();
