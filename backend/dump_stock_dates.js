import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'DHY Production - New Link (3).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Stock in hand'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    const headers = rows[1];
    
    // Let's find rows for March 31, 2026 and April 30, 2026
    const findAndPrintDate = (targetDateStr) => {
        console.log(`\nStock levels for date: ${targetDateStr}`);
        const found = rows.find(row => {
            const dateVal = row[1];
            if (!dateVal) return false;
            let dateStr = '';
            if (dateVal instanceof Date) {
                dateStr = dateVal.toISOString().split('T')[0];
            } else {
                dateStr = String(dateVal);
            }
            return dateStr.includes(targetDateStr);
        });
        
        if (found) {
            console.log(`Row values:`);
            headers.forEach((header, index) => {
                const val = found[index];
                if (val !== null && val !== undefined && val !== '') {
                    console.log(`- ${header} (Col ${index}): ${val}`);
                }
            });
        } else {
            console.log(`❌ No row found for date ${targetDateStr}`);
        }
    };
    
    findAndPrintDate('2026.03.31');
    findAndPrintDate('2026.04.30');
}

run();
