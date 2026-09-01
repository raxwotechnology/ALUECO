import Permission from '../models/Permission.js';

// ── Master permissions list ─────────────────────────────────────────────────
const PERMISSIONS = [
    // Dashboard
    { code: 'dashboard.view', label: 'View Dashboard', module: 'dashboard', description: 'Access the main dashboard' },

    // Catalog
    { code: 'products.view', label: 'View Products', module: 'catalog', description: 'View product list' },
    { code: 'products.create', label: 'Create Products', module: 'catalog', description: 'Add new products' },
    { code: 'products.edit', label: 'Edit Products', module: 'catalog', description: 'Edit existing products' },
    { code: 'products.delete', label: 'Delete Products', module: 'catalog', description: 'Delete products' },
    { code: 'categories.manage', label: 'Manage Categories', module: 'catalog', description: 'CRUD categories' },
    { code: 'brands.manage', label: 'Manage Brands', module: 'catalog', description: 'CRUD brands' },
    { code: 'uom.manage', label: 'Manage Units', module: 'catalog', description: 'CRUD units of measure' },

    // Inventory
    { code: 'inventory.view', label: 'View Stock', module: 'inventory', description: 'View stock levels' },
    { code: 'inventory.adjust', label: 'Adjust Stock', module: 'inventory', description: 'Make stock adjustments' },
    { code: 'inventory.transfer', label: 'Transfer Stock', module: 'inventory', description: 'Transfer between warehouses' },
    { code: 'inventory.opening', label: 'Opening Stock', module: 'inventory', description: 'Set opening stock balances' },
    { code: 'warehouses.manage', label: 'Manage Warehouses', module: 'inventory', description: 'CRUD warehouses' },

    // Sales
    { code: 'sales.view', label: 'View Sales Orders', module: 'sales', description: 'View sales orders' },
    { code: 'sales.create', label: 'Create Sales Orders', module: 'sales', description: 'Create new sales orders' },
    { code: 'sales.edit', label: 'Edit Sales Orders', module: 'sales', description: 'Edit sales orders' },
    { code: 'sales.approve', label: 'Approve Sales Orders', module: 'sales', description: 'Approve/confirm sales orders' },
    { code: 'sales.delete', label: 'Delete Sales Orders', module: 'sales', description: 'Delete/cancel sales orders' },
    { code: 'customers.view', label: 'View Customers', module: 'sales', description: 'View customer list' },
    { code: 'customers.manage', label: 'Manage Customers', module: 'sales', description: 'CRUD customers' },
    { code: 'customer_groups.manage', label: 'Manage Customer Groups', module: 'sales', description: 'CRUD customer groups' },
    { code: 'pos.access', label: 'Access POS', module: 'sales', description: 'Access Point of Sale' },

    // Purchasing
    { code: 'purchasing.view', label: 'View Purchase Orders', module: 'purchasing', description: 'View purchase orders' },
    { code: 'purchasing.create', label: 'Create Purchase Orders', module: 'purchasing', description: 'Create new purchase orders' },
    { code: 'purchasing.edit', label: 'Edit Purchase Orders', module: 'purchasing', description: 'Edit purchase orders' },
    { code: 'purchasing.approve', label: 'Approve Purchase Orders', module: 'purchasing', description: 'Approve purchase orders' },
    { code: 'purchasing.delete', label: 'Delete Purchase Orders', module: 'purchasing', description: 'Delete/cancel purchase orders' },
    { code: 'suppliers.view', label: 'View Suppliers', module: 'purchasing', description: 'View supplier list' },
    { code: 'suppliers.manage', label: 'Manage Suppliers', module: 'purchasing', description: 'CRUD suppliers' },
    { code: 'grn.manage', label: 'Manage GRNs', module: 'purchasing', description: 'Create/edit Goods Receipt Notes' },

    // Finance
    { code: 'invoices.view', label: 'View Invoices', module: 'finance', description: 'View invoices' },
    { code: 'invoices.create', label: 'Create Invoices', module: 'finance', description: 'Create new invoices' },
    { code: 'invoices.edit', label: 'Edit Invoices', module: 'finance', description: 'Edit invoices' },
    { code: 'bills.view', label: 'View Bills', module: 'finance', description: 'View bills' },
    { code: 'bills.manage', label: 'Manage Bills', module: 'finance', description: 'Create/edit bills' },
    { code: 'payments.view', label: 'View Payments', module: 'finance', description: 'View payments' },
    { code: 'payments.manage', label: 'Manage Payments', module: 'finance', description: 'Create/edit payments' },
    { code: 'credit_notes.view', label: 'View Credit Notes', module: 'finance', description: 'View credit notes' },
    { code: 'credit_notes.manage', label: 'Manage Credit Notes', module: 'finance', description: 'Create/edit credit notes' },

    // Production
    { code: 'bom.view', label: 'View BOMs', module: 'production', description: 'View bills of materials' },
    { code: 'bom.manage', label: 'Manage BOMs', module: 'production', description: 'CRUD bills of materials' },
    { code: 'production.view', label: 'View Production Orders', module: 'production', description: 'View production orders' },
    { code: 'production.manage', label: 'Manage Production Orders', module: 'production', description: 'Create/edit production orders' },

    // After-Sales
    { code: 'returns.view', label: 'View Returns', module: 'after_sales', description: 'View customer returns' },
    { code: 'returns.manage', label: 'Manage Returns', module: 'after_sales', description: 'Create/process customer returns' },
    { code: 'supplier_returns.view', label: 'View Supplier Returns', module: 'after_sales', description: 'View supplier returns' },
    { code: 'supplier_returns.manage', label: 'Manage Supplier Returns', module: 'after_sales', description: 'Create/process supplier returns' },
    { code: 'damages.view', label: 'View Damages', module: 'after_sales', description: 'View damage records' },
    { code: 'damages.manage', label: 'Manage Damages', module: 'after_sales', description: 'Create/edit damage records' },
    { code: 'repairs.view', label: 'View Repairs', module: 'after_sales', description: 'View repair orders' },
    { code: 'repairs.manage', label: 'Manage Repairs', module: 'after_sales', description: 'Create/edit repair orders' },

    // HR
    { code: 'hr.employees.view', label: 'View Employees', module: 'hr', description: 'View employee list' },
    { code: 'hr.employees.manage', label: 'Manage Employees', module: 'hr', description: 'CRUD employees' },
    { code: 'hr.departments.manage', label: 'Manage Departments', module: 'hr', description: 'CRUD departments' },
    { code: 'hr.designations.manage', label: 'Manage Designations', module: 'hr', description: 'CRUD designations' },
    { code: 'hr.shifts.manage', label: 'Manage Shifts', module: 'hr', description: 'CRUD shifts' },
    { code: 'hr.attendance.view', label: 'View Attendance', module: 'hr', description: 'View attendance records' },
    { code: 'hr.attendance.manage', label: 'Manage Attendance', module: 'hr', description: 'Mark/edit attendance' },
    { code: 'hr.leaves.view', label: 'View Leave Requests', module: 'hr', description: 'View leave requests' },
    { code: 'hr.leaves.manage', label: 'Manage Leave Requests', module: 'hr', description: 'Approve/reject leave requests' },
    { code: 'hr.holidays.manage', label: 'Manage Holidays', module: 'hr', description: 'CRUD holidays' },
    { code: 'hr.salary.view', label: 'View Salary Structures', module: 'hr', description: 'View salary structures' },
    { code: 'hr.salary.manage', label: 'Manage Salary Structures', module: 'hr', description: 'CRUD salary structures' },
    { code: 'hr.payroll.view', label: 'View Payroll', module: 'hr', description: 'View payroll records' },
    { code: 'hr.payroll.manage', label: 'Manage Payroll', module: 'hr', description: 'Generate/edit payroll' },

    // Reports
    { code: 'reports.sales', label: 'Sales Reports', module: 'reports', description: 'Access sales reports' },
    { code: 'reports.inventory', label: 'Inventory Reports', module: 'reports', description: 'Access inventory reports' },
    { code: 'reports.financial', label: 'Financial Reports', module: 'reports', description: 'Access financial reports' },
    { code: 'reports.production', label: 'Production Reports', module: 'reports', description: 'Access production reports' },
    { code: 'reports.hr', label: 'HR Reports', module: 'reports', description: 'Access HR reports' },

    // Administration
    { code: 'admin.users.view', label: 'View Users', module: 'admin', description: 'View user list' },
    { code: 'admin.users.manage', label: 'Manage Users', module: 'admin', description: 'CRUD users' },
    { code: 'admin.roles.view', label: 'View Roles', module: 'admin', description: 'View roles and permissions' },
    { code: 'admin.roles.manage', label: 'Manage Roles', module: 'admin', description: 'Assign permissions to roles' },
    { code: 'admin.settings', label: 'System Settings', module: 'admin', description: 'Access system settings' },
    { code: 'admin.audit_logs', label: 'View Audit Logs', module: 'admin', description: 'View audit trail' },
];

// ── Default permissions per role ────────────────────────────────────────────
export const ROLE_PERMISSIONS = {
    super_admin: ['*'], // wildcard = all permissions
    admin: ['*'],

    warehouse_manager: [
        'dashboard.view',
        'products.view', 'products.create', 'products.edit',
        'categories.manage', 'brands.manage', 'uom.manage',
        'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.opening',
        'warehouses.manage',
        'purchasing.view', 'grn.manage',
        'suppliers.view',
        'damages.view', 'damages.manage',
        'repairs.view', 'repairs.manage',
        'supplier_returns.view', 'supplier_returns.manage',
        'reports.inventory',
    ],

    sales_manager: [
        'dashboard.view',
        'products.view',
        'inventory.view',
        'sales.view', 'sales.create', 'sales.edit', 'sales.approve', 'sales.delete',
        'customers.view', 'customers.manage', 'customer_groups.manage',
        'pos.access',
        'invoices.view', 'invoices.create', 'invoices.edit',
        'payments.view', 'payments.manage',
        'credit_notes.view', 'credit_notes.manage',
        'returns.view', 'returns.manage',
        'reports.sales',
    ],

    hr_manager: [
        'dashboard.view',
        'hr.employees.view', 'hr.employees.manage',
        'hr.departments.manage', 'hr.designations.manage',
        'hr.shifts.manage',
        'hr.attendance.view', 'hr.attendance.manage',
        'hr.leaves.view', 'hr.leaves.manage',
        'hr.holidays.manage',
        'hr.salary.view', 'hr.salary.manage',
        'hr.payroll.view', 'hr.payroll.manage',
        'reports.hr',
    ],

    accountant: [
        'dashboard.view',
        'invoices.view', 'invoices.create', 'invoices.edit',
        'bills.view', 'bills.manage',
        'payments.view', 'payments.manage',
        'credit_notes.view', 'credit_notes.manage',
        'purchasing.view',
        'sales.view',
        'customers.view',
        'suppliers.view',
        'reports.sales', 'reports.financial',
    ],

    cashier: [
        'dashboard.view',
        'products.view',
        'inventory.view',
        'sales.view', 'sales.create',
        'customers.view',
        'pos.access',
        'invoices.view', 'invoices.create',
        'payments.view', 'payments.manage',
    ],

    employee: [
        'dashboard.view',
        'hr.attendance.view',
        'hr.leaves.view',
        'hr.payroll.view',
    ],

    // Legacy role mappings (backward compatibility)
    manager: ['*'],
    sales_rep: [
        'dashboard.view',
        'products.view',
        'inventory.view',
        'sales.view', 'sales.create', 'sales.edit',
        'customers.view', 'customers.manage',
        'pos.access',
        'invoices.view',
        'payments.view',
        'returns.view', 'returns.manage',
    ],
    warehouse_staff: [
        'dashboard.view',
        'products.view',
        'inventory.view', 'inventory.adjust', 'inventory.transfer',
        'grn.manage',
        'suppliers.view',
        'damages.view', 'damages.manage',
        'repairs.view',
        'reports.inventory',
    ],
    production_staff: [
        'dashboard.view',
        'products.view',
        'inventory.view',
        'bom.view', 'bom.manage',
        'production.view', 'production.manage',
        'reports.production',
    ],
    staff: [
        'dashboard.view',
    ],
};

// ── Seed function ───────────────────────────────────────────────────────────
export async function seedPermissions() {
    try {
        const existing = await Permission.countDocuments();
        if (existing >= PERMISSIONS.length) {
            console.log('✓ Permissions already seeded, skipping');
            return;
        }

        // Upsert all permissions
        const ops = PERMISSIONS.map((p) => ({
            updateOne: {
                filter: { code: p.code },
                update: { $set: p },
                upsert: true,
            },
        }));
        await Permission.bulkWrite(ops);
        console.log(`✓ Seeded ${PERMISSIONS.length} permissions`);
    } catch (error) {
        console.error('✗ Error seeding permissions:', error.message);
    }
}
