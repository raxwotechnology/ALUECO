import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Printer, Download, Calendar, DollarSign, CreditCard, Layers, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerStatementModal({ isOpen, onClose, customerId }) {
    const [loading, setLoading] = useState(true);
    const [statementData, setStatementData] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchStatement = async () => {
        if (!customerId) return;
        setLoading(true);
        try {
            let url = `/customers/${customerId}/statement`;
            const params = [];
            if (startDate) params.push(`startDate=${startDate}`);
            if (endDate) params.push(`endDate=${endDate}`);
            if (params.length > 0) url += `?${params.join('&')}`;

            const res = await api.get(url);
            setStatementData(res.data.data);
        } catch (error) {
            toast.error('Failed to load customer statement');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && customerId) {
            fetchStatement();
        }
    }, [isOpen, customerId]);

    const handlePrint = () => {
        window.print();
    };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    if (!isOpen) return null;

    const customer = statementData?.customer;
    const summary = statementData?.summary;
    const ledger = statementData?.ledger || [];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Customer Statement & Outstanding Ledger" size="xl">
            <div className="p-6 space-y-6">
                {/* Date Filter & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 print:hidden">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase">From:</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="px-3 py-1.5 border rounded-lg text-xs"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-500 uppercase">To:</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="px-3 py-1.5 border rounded-lg text-xs"
                            />
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchStatement}>Filter</Button>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={handlePrint}>
                            <Printer size={15} className="mr-1.5" /> Print Statement
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-slate-500">Loading statement details...</div>
                ) : (
                    <div className="space-y-6 print:p-0">
                        {/* Statement Header */}
                        <div className="flex justify-between items-start border-b pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900">{customer?.displayName}</h2>
                                <p className="text-xs text-slate-500">{customer?.companyName} ({customer?.customerCode})</p>
                                <p className="text-xs text-slate-500 mt-1">Phone: {customer?.primaryContact?.phone || 'N/A'} | Email: {customer?.primaryContact?.email || 'N/A'}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Statement Date</span>
                                <p className="text-sm font-semibold text-slate-800">{new Date().toLocaleDateString('en-LK')}</p>
                            </div>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Total Invoiced</span>
                                <p className="text-base font-bold text-slate-900 mt-1">{fmt(summary?.totalInvoiced)}</p>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                                <span className="text-[10px] font-bold text-emerald-600 uppercase">Total Paid</span>
                                <p className="text-base font-bold text-emerald-700 mt-1">{fmt(summary?.totalPaid)}</p>
                            </div>
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                                <span className="text-[10px] font-bold text-amber-600 uppercase">Advance Amount</span>
                                <p className="text-base font-bold text-amber-700 mt-1">{fmt(summary?.advanceAmount)}</p>
                            </div>
                            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
                                <span className="text-[10px] font-bold text-rose-600 uppercase">Outstanding Balance</span>
                                <p className="text-base font-bold text-rose-700 mt-1">{fmt(summary?.outstandingBalance)}</p>
                            </div>
                        </div>

                        {/* Statement Ledger Table */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                                        <th className="p-3">Date</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Ref #</th>
                                        <th className="p-3">Description & Linked Docs</th>
                                        <th className="p-3 text-right">Debit (LKR)</th>
                                        <th className="p-3 text-right">Credit (LKR)</th>
                                        <th className="p-3 text-right">Balance (LKR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {ledger.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-400 italic">No transactions found for this period.</td>
                                        </tr>
                                    ) : (
                                        ledger.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition">
                                                <td className="p-3 font-medium text-slate-700">{new Date(item.date).toLocaleDateString('en-LK')}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        item.type === 'INVOICE' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                                                    }`}>
                                                        {item.type}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono font-semibold text-slate-800">{item.refNumber}</td>
                                                <td className="p-3 text-slate-600">
                                                    <p>{item.description}</p>
                                                    {item.chequeNumber && (
                                                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded ml-1">
                                                            Cheque: #{item.chequeNumber} ({item.chequeStatus || 'pending'})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right font-mono font-semibold text-slate-800">{item.debit > 0 ? fmt(item.debit) : '—'}</td>
                                                <td className="p-3 text-right font-mono font-semibold text-emerald-600">{item.credit > 0 ? fmt(item.credit) : '—'}</td>
                                                <td className="p-3 text-right font-mono font-bold text-slate-900">{fmt(item.runningBalance)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
