import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'DHY Production - New Link (3).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Stock in hand'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    console.log('Scanning rows 630 to 1000 in Stock in Hand:');
    for (let i = 630; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        
        // Check if there is any non-null cell
        const hasContent = row.some(cell => cell !== null && cell !== '');
        if (hasContent) {
            console.log(`Row ${i+1}:`, row.slice(0, 15));
        }
    }
}

run();
