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

// Auto-seeding of Alu defaults completely removed as requested.

export const seedDefaults = async () => {
    try {
        await seedAdminUser();
        await seedPermissions();
        // Auto-seeding of defaults disabled to preserve a clean 0-state database as requested
    } catch (error) {
        console.error('Seed error:', error.message);
    }
};