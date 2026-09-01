import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs-extra';

const files = [
    'DHY Petty cash - New Link (1).xlsx',
    'DHY Production - New Link (3).xlsx',
    'P&L.xlsx',
    'March 2026 BE DHY (2).xlsx'
];

const products = [
    'Moringa Leaves', 'Moringa Powder', 'Gotukola Powder', 'Curry leaves', 
    'Heenbovitiya', 'Moringa TB', 'Heenbovitiya Powder', 'Tapioca', 
    'Katupila TB', 'Curry Leav TB', 'Gotukola TB', 'Soursop'
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
                    const rowStr = JSON.stringify(row).toLowerCase();
                    const match = products.find(p => rowStr.includes(p.toLowerCase()));
                    if (match && (rowStr.includes('cost') || rowStr.includes('rate') || rowStr.includes('price') || rowIdx < 5)) {
                        // Print match
                        console.log(`[${file} -> ${sheetName}] Row ${rowIdx+1}:`, row.slice(0, 12));
                    }
                });
            }
        } catch (err) {
            console.error(`Error reading ${file}:`, err.message);
        }
    }
}

run();
