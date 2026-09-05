import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Receipt, TrendingUp, DollarSign, RefreshCw, X, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import DynamicForm from '../components/ui/DynamicForm';

export default function BankAccountsPage() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [loadingLedger, setLoadingLedger] = useState(false);
    
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        bankName: '',
        accountName: '',
        accountNumber: '',
        branchName: '',
        accountType: 'current',
        balance: 0,
    });

    const formSchema = [
        { name: 'bankName', label: 'Bank Name', type: 'text', required: true },
        { name: 'accountName', label: 'Account Holder Name', type: 'text', required: true },
        { name: 'accountNumber', label: 'Account Number', type: 'text', required: true },
        { name: 'branchName', label: 'Branch Name', type: 'text' },
        { 
            name: 'accountType', 
            label: 'Account Type', 
            type: 'select', 
            options: [
                { value: 'current', label: 'Current Account' },
                { value: 'savings', label: 'Savings Account' }
            ] 
        },
        { name: 'balance', label: 'Initial / Starting Balance (LKR)', type: 'number', required: true },
    ];

    const fetchAccounts = async () => {
        setLoadingAccounts(true);
        try {
            const { data } = await api.get('/finance/bank-accounts');
            const list = data.data || [];
            setAccounts(list);
            
            // Auto-select first account if none selected
            if (list.length > 0 && !selectedAccount) {
                setSelectedAccount(list[0]);
            } else if (list.length > 0 && selectedAccount) {
                // Keep selection updated
                const updated = list.find(a => a._id === selectedAccount._id);
                if (updated) setSelectedAccount(updated);
            }
        } catch (error) {
            toast.error('Failed to load bank accounts');
        } finally {
            setLoadingAccounts(false);
        }
    };

    const fetchLedger = async (accountId) => {
        if (!accountId) return;
        setLoadingLedger(true);
        try {
            const { data } = await api.get(`/finance/bank-accounts/${accountId}/ledger`);
            setLedger(data.ledger || []);
        } catch (error) {
            toast.error('Failed to load account ledger');
        } finally {
            setLoadingLedger(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        if (selectedAccount) {
            fetchLedger(selectedAccount._id);
        }
    }, [selectedAccount]);

    const handleFormChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        setSaving(true);
        try {
            await api.post('/finance/bank-accounts', formData);
            toast.success('Bank account registered successfully');
            setIsModalOpen(false);
            setFormData({
                bankName: '',
                accountName: '',
                accountNumber: '',
                branchName: '',
                accountType: 'current',
                balance: 0,
            });
            fetchAccounts();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to register account');
        } finally {
            setSaving(false);
        }
    };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    // Metrics
    const totalCashPool = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const activeAccountsCount = accounts.filter(a => a.isActive).length;

    const columns = [
        { 
            key: 'date', 
            label: 'Date', 
            render: (r) => <span className="text-gray-600 text-xs">{fmtDate(r.date)}</span> 
        },
        { 
            key: 'paymentNumber', 
            label: 'Ref #', 
            render: (r) => (
                <button 
                    onClick={() => navigate(`/payments/${r._id}`)} 
                    className="font-mono text-xs text-primary-600 hover:underline font-semibold"
                >
                    {r.paymentNumber}
                </button>
            ) 
        },
        { key: 'partyName', label: 'Party / Description', render: (r) => <span className="font-semibold text-gray-800">{r.partyName}</span> },
        { 
            key: 'type', 
            label: 'Type', 
            render: (r) => (
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    r.type === 'deposit' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                    {r.type === 'deposit' ? <ArrowUpRight size={10} /> : <ArrowDownLeft size={10} />}
                    {r.type}
                </span>
            )
        },
        { 
            key: 'amount', 
            label: 'Amount (LKR)', 
            render: (r) => (
                <span className={`font-mono font-bold ${r.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {r.type === 'deposit' ? '+' : '-'}{fmt(r.amount)}
                </span>
            ) 
        },
        { 
            key: 'runningBalance', 
            label: 'Balance', 
            render: (r) => <span className="font-mono font-bold text-slate-800">{fmt(r.runningBalance)}</span> 
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Bank Account Ledgers" 
                description="Manage corporate bank accounts, trace real-time liquid balances, and view ledger statements"
                actions={
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={16} className="mr-1.5" /> New Bank Account
                    </Button>
                } 
            />

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Cash Pool (Liquid Balance)</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{fmt(totalCashPool)}</p>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center text-violet-600">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Bank Accounts</p>
                        <p className="text-2xl font-black text-gray-900 mt-0.5">{activeAccountsCount} Accounts</p>
                    </div>
                </div>
            </div>

            {/* Left and Right Pane Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Pane: Bank Accounts list */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider select-none">Bank Accounts</h3>
                    {loadingAccounts ? (
                        Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)
                    ) : accounts.length === 0 ? (
                        <div className="p-8 bg-white border border-dashed border-gray-300 rounded-2xl text-center text-gray-500 italic">
                            No bank accounts configured.
                        </div>
                    ) : (
                        accounts.map((acc) => {
                            const isSelected = selectedAccount?._id === acc._id;
                            return (
                                <div 
                                    key={acc._id}
                                    onClick={() => setSelectedAccount(acc)}
                                    className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                                        isSelected 
                                            ? 'border-primary-500 bg-primary-50/30 shadow-md ring-2 ring-primary-500/10' 
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-gray-900">{acc.bankName}</h4>
                                            <p className="text-xs font-semibold text-gray-500 mt-0.5 capitalize">{acc.accountType} Account</p>
                                        </div>
                                        <Badge variant={acc.isActive ? 'success' : 'neutral'}>
                                            {acc.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-dashed border-gray-100 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-mono tracking-wider">ACC: {acc.accountNumber}</p>
                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate max-w-[150px]">{acc.accountName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400 font-semibold uppercase">Balance</p>
                                            <p className="text-base font-black text-gray-900 font-mono mt-0.5">{fmt(acc.balance)}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Right Pane: Selected Bank Account Ledger Statement */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider select-none">Ledger Statement</h3>
                        {selectedAccount && (
                            <button 
                                onClick={() => fetchLedger(selectedAccount._id)} 
                                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 transition flex items-center gap-1.5 text-xs text-gray-500 bg-white font-medium"
                                title="Refresh statement"
                            >
                                <RefreshCw size={14} className={loadingLedger ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        )}
                    </div>

                    {!selectedAccount ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400">
                            Select a bank account on the left to view its statement.
                        </div>
                    ) : (
                        <Card className="overflow-hidden">
                            <div className="p-5 border-b border-gray-200 bg-slate-50 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{selectedAccount.bankName} Ledger</h3>
                                    <p className="text-xs text-gray-500 font-mono mt-0.5">Account Number: {selectedAccount.accountNumber} · Holder: {selectedAccount.accountName}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-semibold text-gray-400 uppercase block">Liquid Balance</span>
                                    <span className="text-xl font-black text-slate-800 font-mono">{fmt(selectedAccount.balance)}</span>
                                </div>
                            </div>

                            {loadingLedger ? (
                                <div className="py-16 text-center text-gray-500">Loading ledger statement transactions...</div>
                            ) : ledger.length === 0 ? (
                                <div className="py-16 text-center text-gray-400 italic">
                                    No transactions recorded for this account.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table columns={columns} data={ledger} />
                                </div>
                            )}
                        </Card>
                    )}
                </div>

            </div>

            {/* New Bank Account Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register New Bank Account" size="lg">
                <div className="p-6">
                    <DynamicForm
                        schema={formSchema}
                        formData={formData}
                        onChange={handleFormChange}
                        onSubmit={handleSubmit}
                        loading={saving}
                        submitLabel="Create Account"
                    />
                </div>
            </Modal>
        </div>
    );
}
