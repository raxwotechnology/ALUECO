import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'DHY Production - New Link (3).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Stock in hand'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    console.log('Stock in Hand - Column headers:', rows[1]);
    
    // Find rows for end of March 2026 and end of April 2026
    const marchRows = [];
    const aprilRows = [];
    
    for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        let dateVal = row[1];
        if (!dateVal) continue;
        
        let dateStr = '';
        if (dateVal instanceof Date) {
            dateStr = dateVal.toISOString().split('T')[0];
        } else {
            dateStr = String(dateVal);
        }
        
        if (dateStr.includes('2026-03') || dateStr.includes('/03/2026') || dateStr.includes('.03.2026') || dateStr.includes('2026.03')) {
            marchRows.push({ index: i + 1, date: dateStr, row });
        } else if (dateStr.includes('2026-04') || dateStr.includes('/04/2026') || dateStr.includes('.04.2026') || dateStr.includes('2026.04')) {
            aprilRows.push({ index: i + 1, date: dateStr, row });
        }
    }
    
    console.log(`\nFound ${marchRows.length} rows in March 2026`);
    if (marchRows.length > 0) {
        console.log('Last March rows:');
        marchRows.slice(-5).forEach(r => console.log(`Row ${r.index} [${r.date}]:`, r.row.slice(0, 15)));
    }
    
    console.log(`\nFound ${aprilRows.length} rows in April 2026`);
    if (aprilRows.length > 0) {
        console.log('Last April rows:');
        aprilRows.slice(-5).forEach(r => console.log(`Row ${r.index} [${r.date}]:`, r.row.slice(0, 15)));
    }
}

run();
