import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'DHY Petty cash - New Link (1).xlsx');
    const workbook = xlsx.readFile(filePath);
    
    // Inspect March sheet
    const sheet = workbook.Sheets['March'];
    if (!sheet) {
        console.log('❌ March sheet not found');
        return;
    }
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    console.log('March Petty Cash - First 15 rows:');
    rows.slice(0, 15).forEach((row, i) => {
        // Find date cell (Col 1)
        const cellRef = `A${i+1}`;
        const cell = sheet[cellRef];
        console.log(`Row ${i+1} (${cellRef}):`, cell ? { t: cell.t, v: cell.v, w: cell.w } : null, 'Data:', row.slice(0, 5));
    });
}

run();
