import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'DHY Production - New Link (3).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Production summary'];
    
    // Check cell B6 (Row 6, Col 2)
    const cellB6 = sheet['B6'];
    console.log('Cell B6 raw properties:', cellB6);
    
    // Check cell B4 (Row 4, Col 2)
    const cellB4 = sheet['B4'];
    console.log('Cell B4 raw properties:', cellB4);

    // Check cell B5 (Row 5, Col 2)
    const cellB5 = sheet['B5'];
    console.log('Cell B5 raw properties:', cellB5);
}

run();
