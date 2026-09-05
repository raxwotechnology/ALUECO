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
        
        try {
            const workbook = xlsx.readFile(filePath);
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
                
                rows.forEach((row, rowIdx) => {
                    row.forEach((cell, colIdx) => {
                        if (typeof cell === 'number') {
                            const val = Math.round(cell);
                            if (val === 856685 || val === 714850) {
                                console.log(`✓ Found target number ${val} in [${file} -> ${sheetName}] at Row ${rowIdx+1}, Col ${colIdx+1}: ${cell}`);
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
