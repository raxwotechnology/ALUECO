import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Users, AlertTriangle, Ban, CheckCircle, DollarSign, FileText } from 'lucide-react';
import api from '../api/axios';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import CustomerFormModal from '../features/customers/CustomerFormModal';
import {
    useCustomers, useCustomerGroups, useDeleteCustomer, useToggleCreditHold,
} from '../features/customers/useCustomers';
import { useAuthStore } from '../store/authStore';
import ExportButtons from '../components/ui/ExportButtons';
import { useExport } from '../hooks/useExport';

const statusVariant = {
    active: 'success',
    inactive: 'default',
    prospect: 'info',
    on_hold: 'warning',
    blacklisted: 'danger',
};

export default function CustomersPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'sales_manager', 'sales_rep'].includes(user?.role);
    const canDelete = ['admin', 'manager'].includes(user?.role);
    const canHoldCredit = ['admin', 'manager', 'accountant'].includes(user?.role);

    const [viewMode, setViewMode] = useState('list'); // 'list' | 'financials'
    const [financialRows, setFinancialRows] = useState([]);
    const [finLoading, setFinLoading] = useState(false);

    const [filters, setFilters] = useState({
        search: '', customerGroupId: '', status: '',
        page: 1, limit: 10,
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [togglingHold, setTogglingHold] = useState(null);
    const [holdReason, setHoldReason] = useState('');

    const { data, isLoading } = useCustomers(filters);
    const { data: groupsData } = useCustomerGroups();
    const deleteMutation = useDeleteCustomer();
    const holdMutation = useToggleCreditHold();

    const fetchFinancials = async () => {
        setFinLoading(true);
        try {
            const res = await api.get('/customers/financial-summary');
            setFinancialRows(res.data.data || []);
        } catch { }
        finally { setFinLoading(false); }
    };

    useEffect(() => {
        if (viewMode === 'financials') {
            fetchFinancials();
        }
    }, [viewMode]);

    const customers = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const exportColumns = [
        { header: 'Code', dataKey: 'customerCode' },
        { header: 'Name', dataKey: 'displayName' },
        { header: 'Group', dataKey: 'groupName' },
        { header: 'Phone', dataKey: 'phone' },
        { header: 'Email', dataKey: 'email' },
        { header: 'Balance (LKR)', dataKey: 'balance' },
        { header: 'Status', dataKey: 'status' },
    ];

    const { handleExportExcel, handleExportCSV, handleExportPDF } = useExport({
        title: 'Customer Directory Report',
        columns: exportColumns,
        fileName: 'customers_export',
        module: 'customers'
    });

    const exportData = customers.map(c => ({
        ...c,
        groupName: c.customerGroupId?.name || '—',
        phone: c.primaryContact?.phone || '—',
        email: c.primaryContact?.email || '—',
        balance: c.creditStatus?.currentBalance || 0,
    }));

    const groupOptions = (groupsData?.data || []).map((g) => ({ value: g._id, label: g.name }));

    const formatMoney = (n) => new Intl.NumberFormat('en-LK').format(n || 0);

    const columns = [
        {
            key: 'customerCode', label: 'Code', width: '110px',
            render: (r) => <span className="font-mono text-xs">{r.customerCode}</span>,
        },
        {
            key: 'displayName', label: 'Customer',
            render: (r) => (
                <div onClick={(e) => { e.stopPropagation(); navigate(`/customers/${r._id}`); }} className="cursor-pointer">
                    <p className="font-semibold text-indigo-600 hover:underline flex items-center gap-2">
                        {r.displayName}
                        {r.creditStatus?.onCreditHold && (
                            <span title="On credit hold"><Ban size={14} className="text-red-500" /></span>
                        )}
                        {r.creditStatus?.isOverdue && (
                            <span title="Overdue"><AlertTriangle size={14} className="text-amber-500" /></span>
                        )}
                    </p>
                    {r.companyName && r.companyName !== r.displayName && (
                        <p className="text-xs text-gray-500">{r.companyName}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'customerGroupId', label: 'Group',
            hideOnMobile: true,
            render: (r) =>
                r.customerGroupId ? (
                    <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: r.customerGroupId.color || '#6b7280' }}
                    >
                        {r.customerGroupId.name}
                    </span>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                ),
        },
        {
            key: 'contact', label: 'Contact',
            hideOnMobile: true,
            render: (r) => (
                <div className="text-xs">
                    {r.primaryContact?.name && <p>{r.primaryContact.name}</p>}
                    {r.primaryContact?.phone && <p className="text-gray-500">{r.primaryContact.phone}</p>}
                </div>
            ),
        },
        {
            key: 'paymentTerms', label: 'Terms',
            hideOnMobile: true,
            render: (r) => {
                const t = r.paymentTerms?.type;
                if (t === 'credit') return <Badge variant="info">{r.paymentTerms.creditDays}d credit</Badge>;
                if (t === 'advance') return <Badge variant="warning">Advance</Badge>;
                return <Badge>COD</Badge>;
            },
        },
        {
            key: 'creditStatus', label: 'Outstanding',
            hideOnMobile: true,
            render: (r) => {
                const bal = r.creditStatus?.currentBalance || 0;
                if (bal === 0) return <span className="text-gray-400 text-xs">—</span>;
                return (
                    <span className={r.creditStatus.isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}>
                        LKR {formatMoney(bal)}
                    </span>
                );
            },
        },
        {
            key: 'status', label: 'Status',
            render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge>,
        },
        {
            key: 'actions', label: 'Actions', width: '140px',
            render: (r) => (
                <div className="flex gap-1">
                    {canHoldCredit && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setTogglingHold(r); setHoldReason(''); }}
                            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                            title={r.creditStatus?.onCreditHold ? 'Remove credit hold' : 'Place on credit hold'}
                        >
                            {r.creditStatus?.onCreditHold ? <CheckCircle size={16} className="text-green-600" /> : <Ban size={16} />}
                        </button>
                    )}
                    {canManage && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setEditing(r); setIsFormOpen(true); }}
                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                            title="Edit"
                        >
                            <Edit size={16} />
                        </button>
                    )}
                    {canDelete && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setDeleting(r); }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const handleDelete = async () => {
        await deleteMutation.mutateAsync(deleting._id);
        setDeleting(null);
    };

    const handleToggleHold = async () => {
        await holdMutation.mutateAsync({ id: togglingHold._id, reason: holdReason });
        setTogglingHold(null);
    };

    const handleClose = () => {
        setIsFormOpen(false);
        setEditing(null);
    };

    return (
        <div>
            <PageHeader
                title="Customers"
                description="Manage your wholesale customers"
                actions={
                    <div className="flex gap-2">
                        <ExportButtons
                            onExportPDF={() => handleExportPDF(exportData)}
                            onExportExcel={() => handleExportExcel(exportData)}
                            onExportCSV={() => handleExportCSV(exportData)}
                            onExportAllPDF={() => handleExportPDF(null, true, filters)}
                            onExportAllExcel={() => handleExportExcel(null, true, filters)}
                            onExportAllCSV={() => handleExportCSV(null, true, filters)}
                            isDisabled={customers.length === 0}
                        />
                        {canManage && (
                            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                                <Plus size={16} className="mr-1.5" /> Add Customer
                            </Button>
                        )}
                    </div>
                }
            />

            <Card>
                <div className="p-3 sm:p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold w-full sm:w-auto">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 flex-1 sm:flex-initial transition ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <Users size={14} /> Directory View
                            </button>
                            <button
                                onClick={() => setViewMode('financials')}
                                className={`py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 flex-1 sm:flex-initial transition ${viewMode === 'financials' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                <DollarSign size={14} /> Financial Summary View
                            </button>
                        </div>
                    </div>

                    {viewMode === 'list' && (
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-1 sm:justify-end">
                            <div className="relative flex-1 sm:max-w-xs">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name, code, or phone..."
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 text-sm"
                                    value={filters.search}
                                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                                />
                            </div>
                            <div className="w-full sm:w-44">
                                <Select
                                    placeholder="All Groups"
                                    options={groupOptions}
                                    value={filters.customerGroupId}
                                    onChange={(e) => setFilters((f) => ({ ...f, customerGroupId: e.target.value, page: 1 }))}
                                />
                            </div>
                            <div className="w-full sm:w-36">
                                <Select
                                    placeholder="All Statuses"
                                    options={[
                                        { value: 'active', label: 'Active' },
                                        { value: 'prospect', label: 'Prospect' },
                                        { value: 'on_hold', label: 'On Hold' },
                                        { value: 'inactive', label: 'Inactive' },
                                        { value: 'blacklisted', label: 'Blacklisted' },
                                    ]}
                                    value={filters.status}
                                    onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {viewMode === 'financials' ? (
                    finLoading ? (
                        <div className="py-16 text-center text-gray-500">Loading customer financial summary...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase">
                                        <th className="p-3">Customer</th>
                                        <th className="p-3">Code</th>
                                        <th className="p-3">Phone</th>
                                        <th className="p-3 text-right">Total Invoice Amount</th>
                                        <th className="p-3 text-right">Paid Amount</th>
                                        <th className="p-3 text-right">Unpaid Amount (Balance)</th>
                                        <th className="p-3 text-right">Advance Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {financialRows.map(row => (
                                        <tr key={row._id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/customers/${row._id}`)}>
                                            <td className="p-3 font-semibold text-indigo-600 hover:underline">{row.displayName}</td>
                                            <td className="p-3 font-mono">{row.customerCode}</td>
                                            <td className="p-3">{row.phone}</td>
                                            <td className="p-3 text-right font-mono font-semibold">LKR {formatMoney(row.totalInvoiceAmount)}</td>
                                            <td className="p-3 text-right font-mono font-semibold text-emerald-600">LKR {formatMoney(row.paidAmount)}</td>
                                            <td className="p-3 text-right font-mono font-bold text-rose-600">LKR {formatMoney(row.unpaidAmount)}</td>
                                            <td className="p-3 text-right font-mono font-semibold text-amber-600">LKR {formatMoney(row.advanceAmount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading customers...</div>
                ) : customers.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No customers found"
                        description={filters.search || filters.status ? 'Try adjusting filters' : 'Add your first customer to get started'}
                        action={canManage && !filters.search && (
                            <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                                <Plus size={16} className="mr-1.5" /> Add Customer
                            </Button>
                        )}
                    />
                ) : (
                    <>
                        <Table columns={columns} data={customers} onRowClick={(r) => navigate(`/customers/${r._id}`)} />
                        <Pagination
                            page={filters.page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}
            </Card>

            <CustomerFormModal isOpen={isFormOpen} onClose={handleClose} customer={editing} />

            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Delete Customer"
                message={`Delete "${deleting?.displayName}"? This is a soft delete.`}
                confirmText="Delete"
                variant="danger"
                loading={deleteMutation.isPending}
            />

            <ConfirmDialog
                isOpen={!!togglingHold}
                onClose={() => setTogglingHold(null)}
                onConfirm={handleToggleHold}
                title={togglingHold?.creditStatus?.onCreditHold ? 'Remove Credit Hold' : 'Place on Credit Hold'}
                message={
                    togglingHold?.creditStatus?.onCreditHold
                        ? `Remove credit hold for "${togglingHold?.displayName}"? They will be able to place orders again.`
                        : (
                            <div>
                                <p className="mb-3">Place "{togglingHold?.displayName}" on credit hold?</p>
                                <input
                                    type="text"
                                    placeholder="Reason (required)"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    value={holdReason}
                                    onChange={(e) => setHoldReason(e.target.value)}
                                />
                            </div>
                        )
                }
                confirmText={togglingHold?.creditStatus?.onCreditHold ? 'Remove Hold' : 'Place Hold'}
                variant={togglingHold?.creditStatus?.onCreditHold ? 'primary' : 'danger'}
                loading={holdMutation.isPending}
            />
        </div>
    );
}