import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs-extra';

const files = [
    'P&L.xlsx',
    'March 2026 BE DHY (2).xlsx'
];

const keywords = [
    'moringa', 'gotukola', 'curry', 'heenbovitiya', 'tapioca', 
    'soursop', 'katupila', 'jackfruit', 'yakinaran', 'masbedda', 
    'velpenala', 'paawatta'
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
                    const rowStr = JSON.stringify(row).toLowerCase();
                    const hasKeyword = keywords.some(kw => rowStr.includes(kw));
                    if (hasKeyword) {
                        console.log(`- [${sheetName}] Row ${rowIdx+1}:`, row.filter(cell => cell !== null && cell !== ''));
                    }
                });
            }
        } catch (err) {
            console.error(`Error:`, err.message);
        }
    }
}

run();
