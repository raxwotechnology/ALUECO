import UnitOfMeasure from '../models/UnitOfMeasure.js';
import Category from '../models/Category.js';
import CustomerGroup from '../models/CustomerGroup.js';
import Warehouse from '../models/Warehouse.js';
import Holiday from '../models/Holiday.js';
import User from '../models/User.js';
import { seedPermissions } from './seedPermissions.js';
import AluProfile from '../models/AluProfile.js';
import AluGlass from '../models/AluGlass.js';
import AluAccessory from '../models/AluAccessory.js';
import AluApplication from '../models/AluApplication.js';
import AluQuotation from '../models/AluQuotation.js';
import AluAgreement from '../models/AluAgreement.js';

const defaultUoms = [
    { name: 'Piece', symbol: 'pc', type: 'count' },
    { name: 'Box', symbol: 'box', type: 'count' },
    { name: 'Carton', symbol: 'ctn', type: 'count' },
    { name: 'Dozen', symbol: 'dz', type: 'count' },
    { name: 'Pair', symbol: 'pr', type: 'count' },
    { name: 'Kilogram', symbol: 'kg', type: 'weight' },
    { name: 'Gram', symbol: 'g', type: 'weight' },
    { name: 'Metric Ton', symbol: 'MT', type: 'weight' },
    { name: 'Pound', symbol: 'lb', type: 'weight' },
    { name: 'Liter', symbol: 'L', type: 'volume' },
    { name: 'Milliliter', symbol: 'ml', type: 'volume' },
    { name: 'Meter', symbol: 'm', type: 'length' },
    { name: 'Centimeter', symbol: 'cm', type: 'length' },
    { name: 'Foot', symbol: 'ft', type: 'length' },
    { name: 'Square Meter', symbol: 'sqm', type: 'area' },
    { name: 'Hour', symbol: 'hr', type: 'time' },
];

const defaultCategories = [
    { name: 'Aluminium Profiles', code: 'ALU', type: 'raw_material', displayOrder: 1 },
    { name: 'Glass Sheets', code: 'GLS', type: 'raw_material', displayOrder: 2 },
    { name: 'Accessories & Hardware', code: 'ACC', type: 'raw_material', displayOrder: 3 },
    { name: 'Consumables & Seals', code: 'CNS', type: 'raw_material', displayOrder: 4 },
    { name: 'Finished Doors & Windows', code: 'FIN', type: 'finished_good', displayOrder: 5 },
    { name: 'General', code: 'GEN', type: 'both', displayOrder: 6 },
];

const defaultCustomerGroups = [
    {
        name: 'Platinum',
        code: 'PLAT',
        description: 'Top-tier distributors with largest volumes',
        defaultPaymentTerms: { type: 'credit', creditDays: 45, defaultCreditLimit: 1000000 },
        defaultDiscountPercent: 12,
        priority: 100,
        color: '#6366f1',
    },
    {
        name: 'Gold',
        code: 'GOLD',
        description: 'Established wholesalers',
        defaultPaymentTerms: { type: 'credit', creditDays: 30, defaultCreditLimit: 500000 },
        defaultDiscountPercent: 8,
        priority: 75,
        color: '#f59e0b',
    },
    {
        name: 'Silver',
        code: 'SILV',
        description: 'Regular wholesale customers',
        defaultPaymentTerms: { type: 'credit', creditDays: 15, defaultCreditLimit: 200000 },
        defaultDiscountPercent: 5,
        priority: 50,
        color: '#94a3b8',
    },
    {
        name: 'Standard',
        code: 'STD',
        description: 'General customers, no credit terms',
        defaultPaymentTerms: { type: 'cod', creditDays: 0, defaultCreditLimit: 0 },
        defaultDiscountPercent: 0,
        priority: 10,
        color: '#64748b',
    },
];

const defaultWarehouse = {
    warehouseCode: 'MAIN',
    name: 'Main Warehouse',
    type: 'main',
    address: {
        line1: 'Configure address in settings',
        city: 'Colombo',
        country: 'Sri Lanka',
    },
    zones: [
        { code: 'RCV', name: 'Receiving Zone', type: 'receiving' },
        { code: 'STG', name: 'Storage Zone', type: 'storage' },
        { code: 'DSP', name: 'Dispatch Zone', type: 'dispatch' },
    ],
    capabilities: {
        canShipDirectly: true,
        canReceiveGoods: true,
    },
    isDefault: true,
    isActive: true,
};

// Add this function to your existing seedDefaults.js
const seedSriLankaHolidays = async () => {
    const existing = await Holiday.countDocuments();
    if (existing > 0) {
        console.log('✓ Holidays already seeded, skipping');
        return;
    }

    // Sri Lanka public holidays 2026 (verify with client's accountant before production)
    const holidays2026 = [
        { name: 'Duruthu Full Moon Poya Day', date: '2026-01-03', type: 'poya' },
        { name: 'Tamil Thai Pongal Day', date: '2026-01-14', type: 'religious' },
        { name: 'Independence Day', date: '2026-02-04', type: 'national' },
        { name: 'Navam Full Moon Poya Day', date: '2026-02-01', type: 'poya' },
        { name: 'Mahasivarathri Day', date: '2026-02-15', type: 'religious' },
        { name: 'Medin Full Moon Poya Day', date: '2026-03-03', type: 'poya' },
        { name: 'Bak Full Moon Poya Day', date: '2026-04-01', type: 'poya' },
        { name: 'Day prior to Sinhala and Tamil New Year', date: '2026-04-13', type: 'national' },
        { name: 'Sinhala and Tamil New Year Day', date: '2026-04-14', type: 'national' },
        { name: 'Good Friday', date: '2026-04-03', type: 'religious' },
        { name: 'May Day (Labour Day)', date: '2026-05-01', type: 'national' },
        { name: 'Vesak Full Moon Poya Day', date: '2026-05-01', type: 'poya' },
        { name: 'Day following Vesak', date: '2026-05-02', type: 'poya' },
        { name: 'Poson Full Moon Poya Day', date: '2026-05-31', type: 'poya' },
        { name: 'Esala Full Moon Poya Day', date: '2026-06-29', type: 'poya' },
        { name: 'Nikini Full Moon Poya Day', date: '2026-07-29', type: 'poya' },
        { name: 'Binara Full Moon Poya Day', date: '2026-08-27', type: 'poya' },
        { name: 'Vap Full Moon Poya Day', date: '2026-09-26', type: 'poya' },
        { name: 'Deepavali', date: '2026-10-20', type: 'religious' },
        { name: 'Il Full Moon Poya Day', date: '2026-10-25', type: 'poya' },
        { name: 'Unduvap Full Moon Poya Day', date: '2026-11-24', type: 'poya' },
        { name: 'Christmas Day', date: '2026-12-25', type: 'religious' },
    ];

    for (const h of holidays2026) {
        await Holiday.create({
            name: h.name,
            date: new Date(h.date),
            type: h.type,
            isActive: true,
        });
    }

    console.log(`✓ Seeded ${holidays2026.length} Sri Lanka holidays for 2026`);
};

const seedAdminUser = async () => {
    const existing = await User.countDocuments();
    if (existing > 0) {
        console.log('✓ Users already exist, skipping admin seed');
        return;
    }

    await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@example.com',
        phone: '+94771234567',
        password: 'Admin123!',
        role: 'admin',
    });

    console.log('✓ Seeded default admin user (admin@example.com)');
};

// In your main seedDefaults function, add:
// await seedSriLankaHolidays();

const seedAluDefaults = async () => {
    try {
        const profileCount = await AluProfile.countDocuments();
        if (profileCount === 0) {
            await AluProfile.insertMany([
                {
                    profileCode: 'SD1001',
                    description: 'Outer Frame (Track/Frame)',
                    supplier: 'Swisstek',
                    standardLengths: [
                        { lengthMm: 2134, price: 1500 }, // 7 ft
                        { lengthMm: 3658, price: 2500 }, // 12 ft
                        { lengthMm: 4877, price: 3300 }  // 16 ft
                    ]
                },
                {
                    profileCode: 'SD1002',
                    description: 'Sash Profile',
                    supplier: 'Swisstek',
                    standardLengths: [
                        { lengthMm: 3048, price: 2200 }, // 10 ft
                        { lengthMm: 3658, price: 2600 }, // 12 ft
                        { lengthMm: 4877, price: 3400 }  // 16 ft
                    ]
                },
                {
                    profileCode: 'SD1003',
                    description: 'Interlock Profile',
                    supplier: 'Swisstek',
                    standardLengths: [
                        { lengthMm: 2134, price: 1600 }, // 7 ft
                        { lengthMm: 3658, price: 2700 }  // 12 ft
                    ]
                },
                {
                    profileCode: 'SD1004',
                    description: 'Bottom Track',
                    supplier: 'Swisstek',
                    standardLengths: [
                        { lengthMm: 3048, price: 2100 }, // 10 ft
                        { lengthMm: 4877, price: 3200 }  // 16 ft
                    ]
                },
                {
                    profileCode: 'SD1005',
                    description: 'Top Track',
                    supplier: 'Swisstek',
                    standardLengths: [
                        { lengthMm: 3048, price: 2100 }, // 10 ft
                        { lengthMm: 4877, price: 3200 }  // 16 ft
                    ]
                },
                {
                    profileCode: 'CA5401',
                    description: 'Outer Frame - Casement',
                    supplier: 'Swisstek',
                    standardLengths: [
                        { lengthMm: 3658, price: 2800 }, // 12 ft
                        { lengthMm: 4877, price: 3700 }  // 16 ft
                    ]
                },
                {
                    profileCode: 'CA5402',
                    description: 'Sash Frame - Casement',
                    supplier: 'Swisstek',
                    standardLengths: [
                        { lengthMm: 3658, price: 2900 }, // 12 ft
                        { lengthMm: 4877, price: 3800 }  // 16 ft
                    ]
                },
                {
                    profileCode: 'FD6011',
                    description: 'Glass Clip (Beading)',
                    supplier: 'Swisstek',
                    standardLengths: [
                        { lengthMm: 3658, price: 800 }   // 12 ft
                    ]
                }
            ]);
            console.log('✓ Seeded Alu Profiles');
        }

        const glassCount = await AluGlass.countDocuments();
        if (glassCount === 0) {
            await AluGlass.insertMany([
                { typeName: '5mm Tempered Clear', thickness: '5mm', ratePerSqFt: 350, ratePerSqM: 3767, temperingCharge: 100, processingCharge: 50 },
                { typeName: '5mm Clear', thickness: '5mm', ratePerSqFt: 220, ratePerSqM: 2368, temperingCharge: 0, processingCharge: 30 },
                { typeName: '6mm Tempered Clear', thickness: '6mm', ratePerSqFt: 450, ratePerSqM: 4843, temperingCharge: 120, processingCharge: 60 },
                { typeName: '5mm Tinted', thickness: '5mm', ratePerSqFt: 280, ratePerSqM: 3013, temperingCharge: 0, processingCharge: 40 }
            ]);
            console.log('✓ Seeded Alu Glass rates');
        }

        const accCount = await AluAccessory.countDocuments();
        if (accCount === 0) {
            await AluAccessory.insertMany([
                { code: 'ACC001', name: 'Roller Double', brand: 'Kinlong', unit: 'Nos', purchaseRate: 350, sellingRate: 450 },
                { code: 'ACC002', name: 'Handle C-Groove', brand: 'Kinlong', unit: 'Nos', purchaseRate: 600, sellingRate: 800 },
                { code: 'ACC003', name: 'Multi-point Lock', brand: 'Kinlong', unit: 'Nos', purchaseRate: 550, sellingRate: 750 },
                { code: 'ACC004', name: 'Wool Pile (Weatherstrip)', brand: 'BP', unit: 'm', purchaseRate: 60, sellingRate: 100 },
                { code: 'ACC005', name: 'Silicone Weatherproof', brand: 'DOWSIL', unit: 'Nos', purchaseRate: 800, sellingRate: 1200 },
                { code: 'ACC006', name: 'Friction Hinge 12"', brand: '3H', unit: 'Nos', purchaseRate: 150, sellingRate: 200 },
                { code: 'ACC007', name: 'Corner Bracket', brand: 'General', unit: 'Nos', purchaseRate: 80, sellingRate: 120 }
            ]);
            console.log('✓ Seeded Alu Accessories');
        }

        const appCount = await AluApplication.countDocuments();
        if (appCount === 0) {
            await AluApplication.insertMany([
                {
                    type: 'Sliding Door',
                    configuration: '3 Panel - 2 Track',
                    description: 'Swisstek C-Groove Sliding Door (3 Panel, 2 Track)',
                    profileBOM: [
                        { profileCode: 'SD1001', description: 'Outer Frame Left/Right', quantityFormula: '2', lengthFormula: 'H' },
                        { profileCode: 'SD1001', description: 'Outer Frame Top/Bottom', quantityFormula: '2', lengthFormula: 'W' },
                        { profileCode: 'SD1002', description: 'Sash Vertical', quantityFormula: '6', lengthFormula: 'H - 50' },
                        { profileCode: 'SD1002', description: 'Sash Horizontal', quantityFormula: '6', lengthFormula: 'W / 3' },
                        { profileCode: 'SD1003', description: 'Interlock Vertical', quantityFormula: '2', lengthFormula: 'H - 50' },
                        { profileCode: 'SD1004', description: 'Bottom Track', quantityFormula: '1', lengthFormula: 'W' },
                        { profileCode: 'SD1005', description: 'Top Track', quantityFormula: '1', lengthFormula: 'W' }
                    ],
                    glassBOM: [
                        { glassType: '5mm Tempered Clear', quantityFormula: '3', widthFormula: 'W / 3 - 100', heightFormula: 'H - 180' }
                    ],
                    accessoryBOM: [
                        { accessoryCode: 'ACC001', quantityFormula: '6' },
                        { accessoryCode: 'ACC002', quantityFormula: '2' },
                        { accessoryCode: 'ACC003', quantityFormula: '2' },
                        { accessoryCode: 'ACC004', quantityFormula: '6 * H / 1000 + 6 * (W / 3) / 1000' },
                        { accessoryCode: 'ACC005', quantityFormula: '2' }
                    ],
                    labourMethod: 'opening',
                    labourRate: 25000
                },
                {
                    type: 'Fixed Glass',
                    configuration: '1 Panel',
                    description: 'Standard Fixed Glass Panel',
                    profileBOM: [
                        { profileCode: 'SD1001', description: 'Outer Frame Left/Right', quantityFormula: '2', lengthFormula: 'H' },
                        { profileCode: 'SD1001', description: 'Outer Frame Top/Bottom', quantityFormula: '2', lengthFormula: 'W' },
                        { profileCode: 'FD6011', description: 'Glass Beading Left/Right', quantityFormula: '2', lengthFormula: 'H - 40' },
                        { profileCode: 'FD6011', description: 'Glass Beading Top/Bottom', quantityFormula: '2', lengthFormula: 'W - 40' }
                    ],
                    glassBOM: [
                        { glassType: '5mm Tempered Clear', quantityFormula: '1', widthFormula: 'W - 40', heightFormula: 'H - 40' }
                    ],
                    accessoryBOM: [
                        { accessoryCode: 'ACC005', quantityFormula: '1' }
                    ],
                    labourMethod: 'sqft',
                    labourRate: 350
                },
                {
                    type: 'Casement Window',
                    configuration: '2 Panel',
                    description: 'Swisstek Casement Window (2 Panel)',
                    profileBOM: [
                        { profileCode: 'CA5401', description: 'Outer Frame Left/Right', quantityFormula: '2', lengthFormula: 'H' },
                        { profileCode: 'CA5401', description: 'Outer Frame Top/Bottom', quantityFormula: '2', lengthFormula: 'W' },
                        { profileCode: 'CA5402', description: 'Sash Vertical', quantityFormula: '4', lengthFormula: 'H - 30' },
                        { profileCode: 'CA5402', description: 'Sash Horizontal', quantityFormula: '4', lengthFormula: 'W / 2 - 20' }
                    ],
                    glassBOM: [
                        { glassType: '5mm Tempered Clear', quantityFormula: '2', widthFormula: 'W / 2 - 80', heightFormula: 'H - 90' }
                    ],
                    accessoryBOM: [
                        { accessoryCode: 'ACC006', quantityFormula: '4' },
                        { accessoryCode: 'ACC002', quantityFormula: '2' },
                        { accessoryCode: 'ACC007', quantityFormula: '8' }
                    ],
                    labourMethod: 'opening',
                    labourRate: 8000
                }
            ]);
            console.log('✓ Seeded Alu Application Templates');
        }

        // Sample quotations and agreements seeding removed so database remains clean after cleanup.
    } catch (e) {
        console.error('Alu Seeding error:', e.message);
    }
};

export const seedDefaults = async () => {
    try {
        await seedAdminUser();
        await seedPermissions();
        // Auto-seeding of defaults disabled to preserve a clean 0-state database as requested
    } catch (error) {
        console.error('Seed error:', error.message);
    }
};