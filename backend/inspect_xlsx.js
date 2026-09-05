import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs-extra';

const files = [
    'DHY Petty cash - New Link (1).xlsx',
    'DHY Production - New Link (3).xlsx',
    'P&L.xlsx',
    'March 2026 BE DHY (2).xlsx'
];

async function run() {
    for (const file of files) {
        const filePath = path.resolve(process.cwd(), '..', file);
        if (!fs.existsSync(filePath)) {
            console.log(`❌ File not found: ${file} at ${filePath}`);
            continue;
        }
        console.log(`\n=========================================`);
        console.log(`FILE: ${file}`);
        try {
            const workbook = xlsx.readFile(filePath, { cellDates: true });
            console.log(`Sheets:`, workbook.SheetNames);
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
                console.log(`- Sheet "${sheetName}": ${rows.length} rows`);
                if (rows.length > 0) {
                    console.log(`  Row 1 (Header):`, rows[0].slice(0, 10));
                }
                if (rows.length > 1) {
                    console.log(`  Row 2:`, rows[1].slice(0, 10));
                }
                if (rows.length > 2) {
                    console.log(`  Row 3:`, rows[2].slice(0, 10));
                }
            }
        } catch (err) {
            console.error(`❌ Error reading ${file}:`, err.message);
        }
    }
}

run();
