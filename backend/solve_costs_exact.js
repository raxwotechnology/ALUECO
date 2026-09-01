// Solve for costs:
// March Qty * Cost = 856685
// April Qty * Cost = 714850
// Difference: (5553 - 844)*Cost_soursop + (342.5 - 351)*Cost_moringa_powder = 856685 - 714850 = 141835
// Cost_moringa_powder = 1550 (from spec)
// 4709 * Cost_soursop - 8.5 * 1550 = 141835
// 4709 * Cost_soursop - 13175 = 141835
// 4709 * Cost_soursop = 155010
// Cost_soursop = 32.9178 (which is very close to 33)

// If Cost_soursop is 33, what are the other costs?
// Let's assume standard costs:
// Moringa Powder: 1550
// Soursop 25 bundle (Col 5): 33
// Curry Leav TB: 3 LKR per piece
// Gotukola Powder: 1000 LKR per kg
// Curry leaves: 100 LKR per kg
// Heenbovitiya: 100 LKR per kg
// Moringa TB: 15 LKR per piece
// Heenbovitiya Powder: 1200 LKR per kg
// Tapioca: 100 LKR per kg
// Katupila TB: 15 LKR per piece
// Gotukola TB: 15 LKR per piece

const marchQtys = {
    soursop: 5553,
    moringa_powder: 342.5,
    gotukola_powder: 149,
    curry_leaves: 52,
    heenbovitiya: 500,
    moringa_tb: 500,
    heenbovitiya_powder: 9.8,
    tapioca: 7,
    katupila_tb: 117.5,
    curry_leaf_tb: 45923,
    gotukola_tb: 7
};

const aprilQtys = {
    soursop: 844,
    moringa_powder: 351,
    gotukola_powder: 149,
    curry_leaves: 52,
    heenbovitiya: 500,
    moringa_tb: 500,
    heenbovitiya_powder: 9.8,
    tapioca: 7,
    katupila_tb: 117.5,
    curry_leaf_tb: 45923,
    gotukola_tb: 7
};

const costs = {
    soursop: 32.917816946273095, // solved exactly
    moringa_powder: 1550,
    gotukola_powder: 100, // guess
    curry_leaves: 50, // guess
    heenbovitiya: 50, // guess
    moringa_tb: 10, // guess
    heenbovitiya_powder: 500, // guess
    tapioca: 50, // guess
    katupila_tb: 10, // guess
    curry_leaf_tb: 2.302, // solved guess
    gotukola_tb: 10 // guess
};

function calculate(qtys, costs) {
    let total = 0;
    Object.keys(qtys).forEach(k => {
        total += qtys[k] * costs[k];
    });
    return total;
}

console.log('March Total:', calculate(marchQtys, costs));
console.log('April Total:', calculate(aprilQtys, costs));

// Let's print out what costs would be if we set curry_leaf_tb = 2.30 and others to clean numbers:
// 5553 * 32.9178 + 342.5 * 1550 + 149 * 100 + 52 * 50 + 500 * 50 + 500 * 10 + 9.8 * 500 + 7 * 50 + 117.5 * 10 + 45923 * 2.30 + 7 * 10
// = 182792.5 + 530875 + 14900 + 2600 + 25000 + 5000 + 4900 + 350 + 1175 + 105623 + 70 = 873285.5
