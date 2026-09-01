import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'DHY Production - New Link (3).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Stock in hand'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headers = rows[1];
    
    console.log('Tracing rows 565 to 635:');
    for (let i = 564; i <= 635; i++) {
        const row = rows[i];
        if (!row) continue;
        const dateVal = row[1];
        const prod = row[2];
        const rec = row[3];
        const disp = row[4];
        const col5 = row[5];
        const col6 = row[6];
        
        if (prod === 'Soursop 25 bundle' || col5 !== null || dateVal !== null) {
            console.log(`Row ${i+1} | Date: ${dateVal} | Product: ${prod} | Rec: ${rec} | Disp: ${disp} | Col5 (Moringa Leaves): ${col5} | Col6 (Moringa Powder): ${col6}`);
        }
    }
}

run();
