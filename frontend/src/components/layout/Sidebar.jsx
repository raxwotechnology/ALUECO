import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, BarChart3, Package, ShoppingCart, Users, Settings, Navigation,
    FolderTree, Award, UserCircle, Tags, Warehouse, Boxes, Truck,
    ShoppingBag, FileText, Receipt, Wallet, Workflow, Factory, ShieldCheck,
    RotateCcw, Wrench, AlertTriangle, FileMinus, X, Users as UsersIcon, Building2, Clock, Calendar as CalendarIcon, Plane, Calculator, DollarSign, Upload,
    ClipboardList, UserPlus, Ship, Layers, History, FileSpreadsheet,
    ChevronDown, ChevronRight, CheckSquare, ClipboardCheck, BadgeCheck,
    PackageCheck, CreditCard, Tag, Mail, Sparkles, Home, Search, Scale,
    Plus, ArrowLeftRight, Sliders, LineChart, PieChart, TrendingUp, UserCheck
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { useSettings } from '../../features/settings/useSettings';

// ── Regular grouped menu structure ─────────────────────────────────────────
const menuGroups = [
    {
        label: 'Overview',
        icon: LayoutDashboard,
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'dashboard.view' },
            { label: 'My Profile', icon: UserCheck, path: '/profile' },
        ],
    },
    {
        label: 'PRODUCT MASTER',
        icon: FolderTree,
        items: [
            { label: 'Products', icon: Package, path: '/products', permission: 'products.view' },
            { label: 'Categories', icon: FolderTree, path: '/categories', permission: 'products.view' },
            { label: 'Brands', icon: Award, path: '/brands', permission: 'products.view' },
        ],
    },
    {
        label: 'INVENTORY & STOCK',
        icon: Boxes,
        items: [
            { label: 'Warehouses', icon: Warehouse, path: '/warehouses', permission: 'inventory.view' },
            { label: 'Stock Overview', icon: Boxes, path: '/stock', permission: 'inventory.view' },
            { label: 'Opening Stock', icon: Plus, path: '/stock/opening', permission: 'inventory.opening' },
            { label: 'Stock Transfer', icon: ArrowLeftRight, path: '/stock/transfer', permission: 'inventory.transfer' },
            { label: 'Stock Adjustment', icon: Sliders, path: '/stock/adjustment', permission: 'inventory.adjust' },
            { label: 'Stock Movements', icon: History, path: '/stock/movements', permission: 'inventory.view' },
            { label: 'Raw Materials Inventory', icon: Layers, path: '/inventory/raw-materials', permission: 'inventory.view' },
            { label: 'BOM / Formula Converter', icon: Workflow, path: '/inventory/converter', permission: 'inventory.adjust' },
            { label: 'Conversion Formulas', icon: Scale, path: '/inventory-recipes', permission: 'bom.view' },
        ],
    },
    {
        label: 'PROCUREMENT & SUPPLY',
        icon: ShoppingBag,
        items: [
            { label: 'Suppliers / Farms', icon: Truck, path: '/suppliers', permission: 'suppliers.view' },
            { label: 'Farms Registry', icon: Home, path: '/farms', permission: 'grn.manage' },
            { label: 'Farm Harvests (GRN)', icon: CalendarIcon, path: '/farms/harvests', permission: 'grn.manage' },
            { label: 'Purchase Orders', icon: ShoppingBag, path: '/purchase-orders', permission: 'purchasing.view' },
            { label: 'Goods Receipt Notes (GRN)', icon: PackageCheck, path: '/grns', permission: 'grn.manage' },
            { label: 'Supplier Bills', icon: Receipt, path: '/bills', permission: 'bills.view' },
        ],
    },
    {
        label: 'PRODUCTION',
        icon: Factory,
        items: [
            { label: 'Production Formulas (BOM)', icon: Workflow, path: '/boms', permission: 'bom.view' },
            { label: 'Process Templates', icon: ClipboardList, path: '/manufacturing/templates', permission: 'production.view' },
            { label: 'Production Batches', icon: Layers, path: '/manufacturing/batches', permission: 'production.view' },
            { label: 'Production Orders', icon: Factory, path: '/production-orders', permission: 'production.view' },
        ],
    },
    {
        label: 'FINANCE',
        icon: DollarSign,
        items: [
            { label: 'Customer Invoices', icon: FileText, path: '/invoices', permission: 'invoices.view' },
            { label: 'Payments', icon: Wallet, path: '/payments', permission: 'payments.view' },
            { label: 'Cheque Ledger', icon: FileSpreadsheet, path: '/finance/cheques', permission: 'payments.view' },
            { label: 'Bank Accounts', icon: Building2, path: '/finance/bank-accounts', permission: 'payments.view' },
            { label: 'Petty Cash', icon: DollarSign, path: '/finance/petty-cash', permission: 'payments.view' },
            { label: 'Capital Expenditure (CapEx)', icon: Tag, path: '/finance/fixed-assets', permission: 'payments.view' },
            { label: 'Credit Notes', icon: FileMinus, path: '/credit-notes', permission: 'credit_notes.view' },
        ],
    },
    {
        label: 'SALES & CRM',
        icon: ShoppingCart,
        items: [
            { label: 'Customers', icon: UserCircle, path: '/customers', permission: 'customers.view' },
            { label: 'Customer Groups', icon: Tags, path: '/customer-groups', permission: 'customers.view' },
            { label: 'Sales Inquiries', icon: UserPlus, path: '/crm/inquiries', permission: 'customers.view' },
            { label: 'Quotations', icon: FileText, path: '/crm/quotations', permission: 'sales.view' },
            { label: 'Sales Orders', icon: ShoppingCart, path: '/sales-orders', permission: 'sales.view' },
            { label: 'Sales Pipeline', icon: TrendingUp, path: '/crm/inquiries', permission: 'customers.view' },
            { label: 'POS', icon: Calculator, path: '/pos', permission: 'pos.access' },
            { label: 'Customer Returns', icon: RotateCcw, path: '/returns', permission: 'returns.view' },
            { label: 'Supplier Returns', icon: RotateCcw, path: '/supplier-returns', permission: 'supplier_returns.view' },
            { label: 'Damages', icon: AlertTriangle, path: '/damages', permission: 'damages.view' },
            { label: 'Repairs', icon: Wrench, path: '/repairs', permission: 'repairs.view' },
        ],
    },
    {
        label: 'LOGISTICS & TRANSPORT',
        icon: Truck,
        items: [
            { label: 'Shipment Tracking', icon: Ship, path: '/logistics/shipments', permission: 'inventory.view' },
            { label: 'Export Logistics', icon: Warehouse, path: '/warehouses', permission: 'inventory.view' },
            { label: 'Gate Pass Management', icon: ShieldCheck, path: '/logistics/gate-passes', permission: 'inventory.view' },
            { label: 'Gate Screen', icon: ShieldCheck, path: '/gate-screen', permission: 'inventory.view' },
            { label: 'Vehicle Management', icon: Truck, path: '/fleet/vehicles', permission: 'inventory.view' },
            { label: 'Trip Logs', icon: Navigation, path: '/fleet/trips', permission: 'inventory.view' },
            { label: 'Vehicle Maintenance', icon: Wrench, path: '/maintenance/requests', permission: 'admin.settings' },
        ],
    },
    {
        label: 'HR & PAYROLL',
        icon: UsersIcon,
        items: [
            { label: 'Employees', icon: UsersIcon, path: '/employees', permission: 'hr.employees.view' },
            { label: 'Departments', icon: Building2, path: '/departments', permission: 'hr.employees.view' },
            { label: 'Designations', icon: Award, path: '/designations', permission: 'hr.employees.view' },
            { label: 'Shifts', icon: Clock, path: '/shifts', permission: 'hr.employees.view' },
            { label: 'Attendance', icon: CalendarIcon, path: '/attendance', permission: 'hr.attendance.view' },
            { label: 'Employee of Month', icon: Award, path: '/employees/month', permission: 'hr.employees.view' },
            { label: 'Leave Requests', icon: Plane, path: '/leaves', permission: 'hr.leaves.view' },
            { label: 'Leave Structures', icon: CalendarIcon, path: '/leave-structures', permission: 'hr.leaves.view' },
            { label: 'Holidays', icon: CalendarIcon, path: '/holidays', permission: 'hr.employees.view' },
            { label: 'Salary Structures', icon: Calculator, path: '/salary-structures', permission: 'hr.salary.view' },
            { label: 'Payroll', icon: DollarSign, path: '/payroll', permission: 'hr.payroll.view' },
        ],
    },
    {
        label: 'REPORTS',
        icon: BarChart3,
        items: [
            { label: 'Reports Hub', icon: BarChart3, path: '/reports', anyPermission: ['reports.sales', 'reports.financial', 'reports.inventory', 'reports.hr', 'reports.production'] },
            { label: 'Sales Summary', icon: TrendingUp, path: '/reports/sales', permission: 'reports.sales' },
            { label: 'Sales by Product', icon: Package, path: '/reports/sales-by-product', permission: 'reports.sales' },
            { label: 'Sales by Customer', icon: UsersIcon, path: '/reports/sales-by-customer', permission: 'reports.sales' },
            { label: 'Stock Valuation', icon: DollarSign, path: '/reports/stock-valuation', permission: 'reports.inventory' },
            { label: 'Slow & Fast Movers', icon: TrendingUp, path: '/reports/slow-fast-movers', permission: 'reports.inventory' },
            { label: 'Low Stock Items', icon: AlertTriangle, path: '/reports/inventory/low-stock', permission: 'reports.inventory' },
            { label: 'Stock Movement Log', icon: History, path: '/reports/stock-movement', permission: 'reports.inventory' },
            { label: 'Daily Stock Status', icon: FileText, path: '/reports/daily-stock-status', permission: 'reports.inventory' },
            { label: 'Production Summary', icon: Factory, path: '/reports/production', permission: 'reports.production' },
            { label: 'Yield & Resource Forecaster', icon: Sparkles, path: '/reports/yield-forecaster', permission: 'reports.production' },
            { label: 'Returns & Damages', icon: RotateCcw, path: '/reports/returns-damages', permission: 'reports.sales' },
            { label: 'Financial Snapshot', icon: DollarSign, path: '/reports/financial', permission: 'reports.financial' },
            { label: 'Daily P&L Master', icon: LineChart, path: '/reports/daily-pnl', permission: 'reports.financial' },
            { label: 'Variance & Sales Comparator', icon: BarChart3, path: '/reports/variance-comparator', permission: 'reports.financial' },
            { label: 'HR Reports', icon: UsersIcon, path: '/reports/hr', permission: 'reports.hr' },
            { label: 'Shift Operations Logs', icon: Clock, path: '/reports/shift-wise', permission: 'reports.hr' },
            { label: 'Forecasting', icon: Sparkles, path: '/reports/predictions', anyPermission: ['reports.sales', 'reports.financial', 'reports.inventory', 'reports.production'] },
        ],
    },
    {
        label: 'SYSTEM ADMIN',
        icon: Settings,
        adminOnly: true,
        items: [
            { label: 'Users', icon: Users, path: '/users', permission: 'admin.users.view' },
            { label: 'Roles & Permissions', icon: ShieldCheck, path: '/roles', permission: 'admin.roles.view' },
            { label: 'Data Import', icon: Upload, path: '/import', permission: 'admin.settings' },
            { label: 'Audit Logs', icon: History, path: '/audit-logs', permission: 'view_audit_logs' },
            { label: 'SMS Logs', icon: Mail, path: '/audit-logs/sms', permission: 'view_audit_logs' },
            { label: 'Settings', icon: Settings, path: '/settings', permission: 'admin.settings' },
        ],
    },
];

// ── Approvals accordion structure ───────────────────────────────────────────
// Each category has an icon, label, and list of links with permissions.
const approvalCategories = [
    {
        id: 'inbound',
        label: 'Inbound Materials',
        icon: PackageCheck,
        description: 'GRN Quality & Quantity',
        items: [
            { label: 'Purchase Orders', icon: ShoppingBag, path: '/purchase-orders', permission: 'purchasing.view' },
            { label: 'Goods Receipts (GRN)', icon: ClipboardCheck, path: '/bills', permission: 'bills.view' },
            { label: 'Supplier Returns', icon: RotateCcw, path: '/supplier-returns', permission: 'supplier_returns.view' },
        ],
    },
    {
        id: 'production',
        label: 'Production Batches',
        icon: Factory,
        description: 'QC & Lab Release',
        items: [
            { label: 'Production Orders', icon: Factory, path: '/production-orders', permission: 'production.view' },
            { label: 'Production Batches', icon: Layers, path: '/manufacturing/batches', permission: 'production.view' },
            { label: 'BOMs (Formulas)', icon: Workflow, path: '/boms', permission: 'bom.view' },
        ],
    },
    {
        id: 'expenses',
        label: 'Expense & Petty Cash',
        icon: DollarSign,
        description: 'Operational Cash Releases',
        items: [
            { label: 'Petty Cash', icon: DollarSign, path: '/finance/petty-cash', permission: 'payments.view' },
            { label: 'Bills', icon: Receipt, path: '/bills', permission: 'bills.view' },
            { label: 'Payments', icon: Wallet, path: '/payments', permission: 'payments.view' },
        ],
    },
    {
        id: 'sales',
        label: 'Sales & Pricing',
        icon: Tag,
        description: 'Discount Override Approvals',
        items: [
            { label: 'Sales Orders', icon: ShoppingCart, path: '/sales-orders', permission: 'sales.view' },
            { label: 'Quotations', icon: FileText, path: '/crm/quotations', permission: 'sales.view' },
            { label: 'Invoices', icon: FileText, path: '/invoices', permission: 'invoices.view' },
            { label: 'Credit Notes', icon: CreditCard, path: '/credit-notes', permission: 'credit_notes.view' },
        ],
    },
    {
        id: 'returns',
        label: 'Returns & After-Sales',
        icon: RotateCcw,
        description: 'RMA & Damage Review',
        items: [
            { label: 'Customer Returns (RMA)', icon: RotateCcw, path: '/returns', permission: 'returns.view' },
            { label: 'Repairs', icon: Wrench, path: '/repairs', permission: 'repairs.view' },
            { label: 'Damages', icon: AlertTriangle, path: '/damages', permission: 'damages.view' },
        ],
    },
];

// ── Helper: Check if any item in a category is on the active route ──────────
function useIsCategoryActive(items) {
    const location = useLocation();
    return items.some((item) => location.pathname === item.path || location.pathname.startsWith(item.path + '/'));
}

// ── Approval accordion sub-category component ────────────────────────────────
function ApprovalCategory({ category, hasPermission, hasAnyPermission, isAdmin, searchQuery }) {
    const visibleItems = category.items.filter((item) => {
        const isPermitted = isAdmin ||
            (!item.permission && !item.anyPermission) ||
            (item.permission && hasPermission(item.permission)) ||
            (item.anyPermission && hasAnyPermission(item.anyPermission));

        if (!isPermitted) return false;

        if (!searchQuery) return true;
        return item.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
               category.label.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const isActive = useIsCategoryActive(visibleItems);
    const [isOpen, setIsOpen] = useState(isActive);

    // Auto-open if a child is currently active or if searching
    useEffect(() => {
        if (searchQuery) {
            setIsOpen(visibleItems.length > 0);
        } else {
            setIsOpen(isActive);
        }
    }, [searchQuery, isActive, visibleItems.length]);

    if (visibleItems.length === 0) return null;

    const Icon = category.icon;

    return (
        <div className="mb-0.5">
            {/* Category header button */}
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
            >
                <Icon size={15} className="flex-shrink-0" />
                <div className="flex-1 text-left min-w-0">
                    <p className="truncate leading-tight">{category.label}</p>
                    <p className="text-[10px] text-gray-400 truncate leading-tight">{category.description}</p>
                </div>
                {isOpen
                    ? <ChevronDown size={13} className="flex-shrink-0 text-gray-400" />
                    : <ChevronRight size={13} className="flex-shrink-0 text-gray-400" />
                }
            </button>

            {/* Collapsible items */}
            <div
                style={{
                    maxHeight: isOpen ? `${visibleItems.length * 44}px` : '0px',
                    overflow: 'hidden',
                    transition: 'max-height 0.22s ease',
                }}
            >
                <div className="ml-3 pl-3 border-l-2 border-primary-100 mt-0.5 mb-1 space-y-0.5">
                    {visibleItems.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                            <NavLink
                                key={`${item.label}-${item.path}`}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                        isActive
                                            ? 'bg-primary-100 text-primary-700'
                                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                                    }`
                                }
                            >
                                <ItemIcon size={13} className="flex-shrink-0" />
                                <span className="truncate">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Regular menu group accordion component ────────────────────────────────────
function MenuGroup({ group, searchQuery }) {
    const visibleItems = group.items;
    const isActive = useIsCategoryActive(visibleItems);
    const [isOpen, setIsOpen] = useState(isActive);

    // Auto-open if a child is currently active or if searching
    useEffect(() => {
        if (searchQuery) {
            setIsOpen(visibleItems.length > 0);
        } else {
            setIsOpen(isActive);
        }
    }, [searchQuery, isActive, visibleItems.length]);

    if (visibleItems.length === 0) return null;

    const Icon = group.icon;

    return (
        <div className="mb-2">
            {/* Category header button */}
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                        ? 'bg-primary-50 text-primary-700 font-bold'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
            >
                {Icon && <Icon size={16} className={`flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />}
                <span className="flex-1 text-left truncate text-xs font-semibold uppercase tracking-wider">{group.label}</span>
                {isOpen
                    ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                    : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                }
            </button>

            {/* Collapsible items */}
            <div
                style={{
                    maxHeight: isOpen ? `${visibleItems.length * 44}px` : '0px',
                    overflow: 'hidden',
                    transition: 'max-height 0.22s ease',
                }}
            >
                <div className="ml-3 pl-3 border-l border-gray-100 mt-1 space-y-0.5">
                    {visibleItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={`${item.label}-${item.path}`}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'bg-primary-50 text-primary-700'
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                    }`
                                }
                            >
                                <Icon size={16} className="flex-shrink-0 text-gray-400" />
                                <span className="truncate">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Main Sidebar component ────────────────────────────────────────────────────
export default function Sidebar({ isOpen, onClose }) {
    const sidebarRef = useRef(null);
    const { hasPermission, hasAnyPermission, isAdmin, user } = usePermission();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const [searchQuery, setSearchQuery] = useState('');

    // Date Filter State
    const [dateFilterEnabled, setDateFilterEnabled] = useState(() => {
        return localStorage.getItem('dateFilterEnabled') === 'true';
    });
    const [filterMonth, setFilterMonth] = useState(() => {
        return localStorage.getItem('filterMonth') || String(new Date().getMonth() + 1);
    });
    const [filterYear, setFilterYear] = useState(() => {
        return localStorage.getItem('filterYear') || String(new Date().getFullYear());
    });

    const handleDateFilterToggle = (e) => {
        const enabled = e.target.checked;
        setDateFilterEnabled(enabled);
        localStorage.setItem('dateFilterEnabled', String(enabled));
        
        if (enabled) {
            if (!localStorage.getItem('filterMonth')) {
                localStorage.setItem('filterMonth', filterMonth);
            }
            if (!localStorage.getItem('filterYear')) {
                localStorage.setItem('filterYear', filterYear);
            }
        }
        
        window.location.reload();
    };

    const handleMonthChange = (e) => {
        const m = e.target.value;
        setFilterMonth(m);
        localStorage.setItem('filterMonth', m);
        window.location.reload();
    };

    const handleYearChange = (e) => {
        const y = e.target.value;
        setFilterYear(y);
        localStorage.setItem('filterYear', y);
        window.location.reload();
    };

    // Close on outside click (mobile)
    useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = (e) => {
            if (window.innerWidth < 1024 && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
                onClose();
            }
        };
        const timerId = setTimeout(() => {
            document.addEventListener('mousedown', handleOutsideClick);
        }, 100);
        return () => {
            clearTimeout(timerId);
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen, onClose]);

    // Filter regular groups by permission and search query
    const visibleGroups = menuGroups
        .map((g) => {
            if (user?.role === 'employee' && g.label !== 'Overview') {
                return null;
            }

            const matchedItems = g.items.filter((item) => {
                const isPermitted = isAdmin ||
                    (!item.permission && !item.anyPermission) ||
                    (item.permission && hasPermission(item.permission)) ||
                    (item.anyPermission && hasAnyPermission(item.anyPermission));

                if (!isPermitted) return false;

                if (!searchQuery) return true;
                return item.label.toLowerCase().includes(searchQuery.toLowerCase());
            });

            return {
                ...g,
                items: matchedItems
            };
        })
        .filter((g) => g && g.items.length > 0);

    return (
        <>
            {/* Backdrop overlay (mobile) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar panel */}
            <aside
                ref={sidebarRef}
                style={{
                    width: isOpen ? '256px' : '0px',
                    minWidth: isOpen ? '256px' : '0px',
                    overflow: 'hidden',
                    transition: 'width 0.25s ease, min-width 0.25s ease',
                    flexShrink: 0,
                }}
                className="h-screen bg-white border-r border-gray-200 flex flex-col z-40 relative"
            >
                <div className="w-64 flex flex-col h-full">

                    {/* ── Logo / Brand ── */}
                    <div className="p-5 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-3">
                            {settings?.companyLogo ? (
                                <img
                                    src={settings.companyLogo}
                                    className="w-9 h-9 object-contain rounded-lg flex-shrink-0 border border-gray-100 p-0.5"
                                    alt="Logo"
                                />
                            ) : (
                                <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Package className="w-5 h-5 text-white" />
                                </div>
                            )}
                            <div>
                                <h2 className="font-semibold text-gray-900 leading-none truncate max-w-[145px]" title={settings?.companyName || 'Export Lanka'}>
                                    {settings?.companyName || 'Export Lanka'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[145px]" title={settings?.companyPhone || 'Exports ERP'}>
                                    {settings?.companyPhone || 'Exports ERP'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition lg:hidden"
                            aria-label="Close sidebar"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* ── Search and Date Filter Controls ── */}
                    <div className="px-5 py-4 border-b border-gray-200 space-y-4 flex-shrink-0">
                        {/* Search Menu Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search menu..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500 font-medium text-gray-800"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Date Filter */}
                        <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Date Filter</span>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={dateFilterEnabled}
                                        onChange={handleDateFilterToggle}
                                        className="sr-only peer"
                                    />
                                    <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>

                            {dateFilterEnabled && (
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                    <select
                                        value={filterMonth}
                                        onChange={handleMonthChange}
                                        className="px-2 py-1.5 border border-gray-200 rounded-md text-[11px] focus:ring-2 focus:ring-primary-500 outline-none bg-white font-semibold text-gray-700 cursor-pointer"
                                    >
                                        <option value="1">January</option>
                                        <option value="2">February</option>
                                        <option value="3">March</option>
                                        <option value="4">April</option>
                                        <option value="5">May</option>
                                        <option value="6">June</option>
                                        <option value="7">July</option>
                                        <option value="8">August</option>
                                        <option value="9">September</option>
                                        <option value="10">October</option>
                                        <option value="11">November</option>
                                        <option value="12">December</option>
                                    </select>
                                    <select
                                        value={filterYear}
                                        onChange={handleYearChange}
                                        className="px-2 py-1.5 border border-gray-200 rounded-md text-[11px] focus:ring-2 focus:ring-primary-500 outline-none bg-white font-semibold text-gray-700 cursor-pointer"
                                    >
                                        <option value="2024">2024</option>
                                        <option value="2025">2025</option>
                                        <option value="2026">2026</option>
                                        <option value="2027">2027</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Scrollable nav ── */}
                    <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">

                        {/* ── Regular menu groups ── */}
                        {visibleGroups.map((group) => (
                            <MenuGroup
                                key={group.label}
                                group={group}
                                searchQuery={searchQuery}
                            />
                        ))}

                        {/* ── Approvals Section ── */}
                        {user?.role !== 'employee' && (
                            <div>
                                {/* Section heading with badge */}
                                <div className="flex items-center gap-2 px-3 mb-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 select-none">
                                        Approvals
                                    </p>
                                    <div className="flex items-center gap-1 bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5">
                                        <BadgeCheck size={9} />
                                        <span className="text-[9px] font-bold uppercase tracking-wide">Hub</span>
                                    </div>
                                </div>

                                {/* Accordion categories */}
                                <div className="space-y-0.5">
                                    {approvalCategories.map((category) => (
                                        <ApprovalCategory
                                            key={category.id}
                                            category={category}
                                            hasPermission={hasPermission}
                                            hasAnyPermission={hasAnyPermission}
                                            isAdmin={isAdmin}
                                            searchQuery={searchQuery}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                    </nav>

                    {/* ── Footer ── */}
                    <div className="p-4 border-t border-gray-200 flex-shrink-0">
                        <p className="text-xs text-gray-400">v1.0.0 · MVP</p>
                    </div>
                </div>
            </aside>
        </>
    );
}