import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'March 2026 BE DHY (2).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['BE March 2026'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    console.log('--- BE MARCH 2026 ROW HEADERS ---');
    rows.forEach((row, i) => {
        if (row[1] !== null && row[1] !== undefined && row[1] !== '') {
            // Find any non-null cell values in this row
            const values = [];
            row.forEach((cell, idx) => {
                if (cell !== null && cell !== '') {
                    values.push(`Col ${idx+1} [${idx}]: "${cell}"`);
                }
            });
            console.log(`Row ${i+1}:`, values.slice(0, 5));
        }
    });
}

run();
