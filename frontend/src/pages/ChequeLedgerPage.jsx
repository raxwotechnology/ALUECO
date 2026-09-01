import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Receipt, TrendingUp, TrendingDown, Clock, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import io from 'socket.io-client';
import { getBackendUrl } from '../api/config';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { usePayments } from '../features/payments/usePayments';

export default function ChequeLedgerPage() {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState({
        direction: '',
        status: '',
        method: 'cheque', // Restrict to cheques
        page: 1,
        limit: 15
    });

    const { data, isLoading, refetch } = usePayments(filters);

    useEffect(() => {
        // Socket.IO real-time updates for bank and cheque clearances
        const socket = io(getBackendUrl(), {
            withCredentials: true,
        });
        socket.on('cheque_cleared', () => {
            refetch();
        });
        socket.on('bank_balance_update', () => {
            refetch();
        });
        return () => socket.disconnect();
    }, [refetch]);

    const handleUpdateChequeStatus = async (payment, newStatus) => {
        if (!window.confirm(`Are you sure you want to change status of cheque #${payment.chequeNumber || payment.paymentNumber} to ${newStatus}?`)) {
            return;
        }
        const loadToast = toast.loading(`Updating cheque status to ${newStatus}...`);
        try {
            await api.put(`/payments/${payment._id}/status`, { chequeStatus: newStatus });
            toast.success(`✅ Cheque status updated to ${newStatus} in real-time!`, { id: loadToast });
            refetch();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to update cheque status', { id: loadToast });
        }
    };

    const payments = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    // Calculate quick stats based on returned cheques (or all cheques in this search page)
    const totalReceived = payments
        .filter(p => p.direction === 'received')
        .reduce((sum, p) => sum + p.amount, 0);

    const totalPaid = payments
        .filter(p => p.direction === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

    const pendingChequesCount = payments
        .filter(p => p.chequeStatus !== 'cleared')
        .length;

    // Filter by search query (cheque number, bank name, party name)
    const filteredPayments = payments.filter(p => {
        const query = searchQuery.toLowerCase();
        return (
            (p.chequeNumber && p.chequeNumber.toLowerCase().includes(query)) ||
            (p.bankName && p.bankName.toLowerCase().includes(query)) ||
            (p.partyName && p.partyName.toLowerCase().includes(query)) ||
            (p.paymentNumber && p.paymentNumber.toLowerCase().includes(query))
        );
    });

    const getStatusBadgeVariant = (status) => {
        switch (status?.toLowerCase()) {
            case 'cleared': return 'success';
            case 'pending': return 'warning';
            case 'bounced': return 'danger';
            default: return 'info';
        }
    };

    const columns = [
        { 
            key: 'chequeNumber', 
            label: 'Cheque No.', 
            render: (r) => <span className="font-mono text-xs font-semibold text-slate-700">{r.chequeNumber || 'N/A'}</span> 
        },
        { key: 'chequeDate', label: 'Cheque Date', render: (r) => fmtDate(r.chequeDate) },
        {
            key: 'direction', label: 'Type',
            render: (r) => <Badge variant={r.direction === 'received' ? 'success' : 'info'}>
                {r.direction === 'received' ? 'INCOMING (IN)' : 'OUTGOING (OUT)'}
            </Badge>,
        },
        {
            key: 'party', label: 'Party / Account',
            render: (r) => (
                <div>
                    <p className="font-semibold text-gray-800">{r.partyName}</p>
                    <p className="text-[10px] text-gray-400 font-mono">
                        {r.customerId?.customerCode || r.supplierId?.supplierCode || 'Advance'}
                    </p>
                </div>
            ),
        },
        { key: 'bankName', label: 'Bank', render: (r) => <span className="font-medium text-gray-700">{r.bankName || '—'}</span> },
        {
            key: 'amount', label: 'Amount (LKR)',
            render: (r) => <span className={`font-mono font-bold ${r.direction === 'received' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {r.direction === 'received' ? '+' : '-'}{fmt(r.amount)}
            </span>,
        },
        { 
            key: 'chequeStatus', 
            label: 'Status', 
            render: (r) => {
                const statusStr = r.chequeStatus || 'pending';
                return (
                    <div onClick={(e) => e.stopPropagation()}>
                        <select
                            value={statusStr}
                            onChange={(e) => handleUpdateChequeStatus(r, e.target.value)}
                            className={`text-xs font-bold px-2 py-0.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer ${
                                statusStr === 'cleared' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
                                statusStr === 'bounced' ? 'text-rose-700 bg-rose-50 border-rose-200' :
                                'text-amber-700 bg-amber-50 border-amber-200'
                            }`}
                        >
                            <option value="pending">Pending</option>
                            <option value="cleared">Cleared</option>
                            <option value="bounced">Bounced</option>
                        </select>
                    </div>
                );
            }
        },

        {
            key: 'actions', label: '', width: '50px',
            render: (r) => (
                <button onClick={() => navigate(`/payments/${r._id}`)}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                    title="View details">
                    <Eye size={16} />
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Cheque Ledger" 
                description="Manage and track incoming customer cheques and outgoing supplier cheques"
                actions={
                    <Button variant="primary" onClick={() => navigate('/payments/new')}>
                        Record Cheque Payment
                    </Button>
                } 
            />

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Received (In)</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">{fmt(totalReceived)}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                        <TrendingDown size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Paid (Out)</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">{fmt(totalPaid)}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Uncleared Cheques</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5">{pendingChequesCount} Cheques</p>
                    </div>
                </div>
            </div>

            {/* Filters and Search Bar */}
            <Card>
                <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="w-48">
                            <Select 
                                placeholder="All Directions"
                                options={[{ value: 'received', label: 'Incoming (Customer)' }, { value: 'paid', label: 'Outgoing (Supplier)' }]}
                                value={filters.direction}
                                onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value, page: 1 }))} 
                            />
                        </div>
                        <div className="w-48">
                            <Select 
                                placeholder="All Statuses"
                                options={[
                                    { value: 'pending', label: 'Pending / Uncleared' },
                                    { value: 'cleared', label: 'Cleared' },
                                    { value: 'bounced', label: 'Bounced' },
                                ]}
                                value={filters.status}
                                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} 
                            />
                        </div>
                    </div>

                    <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search Cheque #, Bank, Party..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 w-full bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading cheque ledger...</div>
                ) : filteredPayments.length === 0 ? (
                    <EmptyState 
                        icon={Receipt} 
                        title="No Cheque Records Found" 
                        description="There are no cheque records matches the current filters or query."
                        action={
                            <Button variant="primary" onClick={() => navigate('/payments/new')}>
                                Record Cheque
                            </Button>
                        } 
                    />
                ) : (
                    <>
                        <Table columns={columns} data={filteredPayments} onRowClick={(r) => navigate(`/payments/${r._id}`)} />
                        <Pagination 
                            page={filters.page} 
                            totalPages={totalPages} 
                            total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} 
                        />
                    </>
                )}
            </Card>
        </div>
    );
}
