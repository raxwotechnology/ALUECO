import xlsx from 'xlsx';
import path from 'path';

async function run() {
    // Check Daily Purchase in DHY Production
    const filePathProd = path.resolve(process.cwd(), '..', 'DHY Production - New Link (3).xlsx');
    const workbookProd = xlsx.readFile(filePathProd);
    const purSheet = workbookProd.Sheets['Daily purchus'];
    const purRows = xlsx.utils.sheet_to_json(purSheet, { header: 1, defval: null });
    
    console.log('--- DAILY PURCHASES SAMPLE ---');
    purRows.slice(2, 10).forEach(row => {
        if (row[2]) {
            console.log(`Date: ${row[1]}, Supplier: ${row[2]}, Item: ${row[4]}, Qty: ${row[7]}, Total: ${row[8]}, Rate: ${row[8] / row[7]}`);
        }
    });

    // Check Petty Cash for March
    const filePathPc = path.resolve(process.cwd(), '..', 'DHY Petty cash - New Link (1).xlsx');
    const workbookPc = xlsx.readFile(filePathPc);
    const pcSheet = workbookPc.Sheets['March'];
    const pcRows = xlsx.utils.sheet_to_json(pcSheet, { header: 1, defval: null });
    
    console.log('\n--- PETTY CASH RAW MATERIAL RECORDS ---');
    pcRows.slice(2, 20).forEach(row => {
        if (row[2] && String(row[2]).toLowerCase().includes('moringa')) {
            console.log(`Item: ${row[2]}, Supplier: ${row[3]}, Amount: ${row[4]}, Rate: ${row[6]}, Cost: ${row[7]}`);
        }
    });
}

run();
