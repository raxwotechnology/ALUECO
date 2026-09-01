import xlsx from 'xlsx';
import path from 'path';

async function run() {
    const filePath = path.resolve(process.cwd(), '..', 'DHY Production - New Link (3).xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets['Stock in hand'];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const headers = rows[1];
    
    // Scan all rows and build a map of date -> balances
    const dailyBalances = {};
    const currentBalances = {};
    
    // Initialize balances for all product columns
    for (let col = 5; col < headers.length; col++) {
        if (headers[col]) {
            currentBalances[headers[col]] = 0;
        }
    }
    
    let lastSeenDate = null;
    
    for (let i = 2; i < rows.length; i++) {
        const row = rows[i];
        if (!row) continue;
        
        let dateVal = row[1];
        if (dateVal) {
            if (dateVal instanceof Date) {
                lastSeenDate = dateVal.toISOString().split('T')[0].replace(/-/g, '.');
            } else {
                lastSeenDate = String(dateVal).trim();
            }
        }
        
        if (!lastSeenDate) continue;
        
        // Update balances for any column that has a value in this row
        for (let col = 5; col < headers.length; col++) {
            const h = headers[col];
            if (!h) continue;
            const val = row[col];
            if (val !== null && val !== undefined && val !== '' && typeof val === 'number') {
                currentBalances[h] = val;
            }
        }
        
        // Save copy of current balances for this date
        dailyBalances[lastSeenDate] = { ...currentBalances };
    }
    
    // Now let's print the balances for March 31, 2026 and April 30, 2026
    const printBalances = (dateStr) => {
        console.log(`\nBalances on ${dateStr}:`);
        const bal = dailyBalances[dateStr];
        if (!bal) {
            console.log(`❌ No balances found for date ${dateStr}`);
            // Let's find the nearest date on or before
            const dates = Object.keys(dailyBalances).sort();
            const nearest = dates.filter(d => d <= dateStr).pop();
            console.log(`Nearest date on or before is: ${nearest}`);
            if (nearest) {
                const nearBal = dailyBalances[nearest];
                Object.entries(nearBal).forEach(([prod, qty]) => {
                    if (qty > 0) {
                        console.log(`- ${prod}: ${qty}`);
                    }
                });
            }
        } else {
            Object.entries(bal).forEach(([prod, qty]) => {
                if (qty > 0) {
                    console.log(`- ${prod}: ${qty}`);
                }
            });
        }
    };
    
    printBalances('2026.03.31');
    printBalances('2026.04.30');
}

run();
