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
        if (!fs.existsSync(filePath)) continue;
        console.log(`\n=========================================`);
        console.log(`FILE: ${file}`);
        try {
            const workbook = xlsx.readFile(filePath);
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
                
                rows.forEach((row, rowIdx) => {
                    row.forEach((cell, colIdx) => {
                        if (cell !== null && cell !== undefined) {
                            const str = String(cell).toLowerCase();
                            if (str.includes('856685') || str.includes('856,685') || str.includes('714850') || str.includes('714,850') || str.includes('valuation') || str.includes('closing stock') || str.includes('opening stock')) {
                                console.log(`- [${sheetName}] Row ${rowIdx+1}, Col ${colIdx+1}: "${cell}" (Row snippet: ${row.slice(0, 10)})`);
                            }
                        }
                    });
                });
            }
        } catch (err) {
            console.error(`Error:`, err.message);
        }
    }
}

run();
