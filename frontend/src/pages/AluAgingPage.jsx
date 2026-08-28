import React, { useState, useEffect } from 'react';
import { Clock, Truck, UserCheck, Download } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { downloadCSV } from '../utils/exportUtils';

export default function AluAgingPage() {
    const [agingData, setAgingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('suppliers');

    useEffect(() => {
        fetchAgingData();
    }, []);

    const fetchAgingData = async () => {
        setLoading(true);
        try {
            const res = await api.get('/alu/reports/aging');
            setAgingData(res.data?.data);
        } catch (err) {
            toast.error('Failed to load aging data');
        } finally {
            setLoading(false);
        }
    };

    const supplierAging = agingData?.supplierAging;
    const customerAging = agingData?.customerAging;

    const handleDownload = () => {
        if (activeTab === 'suppliers') {
            const data = (supplierAging?.bills || []).map(b => ({
                BillNumber: b.billNumber,
                SupplierName: b.supplierName,
                DueDate: b.dueDate ? new Date(b.dueDate).toLocaleDateString() : '',
                AgeDays: b.diffDays,
                AmountDue: b.amountDue
            }));
            downloadCSV(data, `Alueco_Supplier_Payables_Aging_${Date.now()}.csv`);
        } else {
            const data = (customerAging?.receivables || []).map(r => ({
                OrderNumber: r.orderNumber,
                ProjectName: r.projectName,
                CustomerName: r.customerName,
                AgeDays: r.diffDays,
                AmountDue: r.amountDue
            }));
            downloadCSV(data, `Alueco_Customer_Receivables_Aging_${Date.now()}.csv`);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <Clock size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Supplier & Customer Aging Analytics</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Tracking outstanding supplier bills, project receivables & overdue age brackets</p>
                    </div>
                </div>
                <button
                    onClick={handleDownload}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
                >
                    <Download size={15} /> Export CSV
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-3 pt-2 rounded-xl border shadow-sm overflow-x-auto gap-2">
                <button
                    onClick={() => setActiveTab('suppliers')}
                    className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'suppliers'
                            ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 rounded-t-lg'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <Truck size={16} />
                    Supplier Payables Aging
                </button>
                <button
                    onClick={() => setActiveTab('customers')}
                    className={`flex items-center gap-2 px-4 py-3 font-bold text-xs border-b-2 transition-all whitespace-nowrap ${
                        activeTab === 'customers'
                            ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50 rounded-t-lg'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                    <UserCheck size={16} />
                    Customer Project Receivables Aging
                </button>
            </div>

            {/* Supplier Payables Aging */}
            {activeTab === 'suppliers' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-400 text-xs font-semibold block">Total Payables</span>
                            <h3 className="text-lg font-bold text-rose-600">LKR {(supplierAging?.totalOutstanding || 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-400 text-xs font-semibold block">0 - 30 Days</span>
                            <h3 className="text-lg font-bold text-emerald-600">LKR {(supplierAging?.current_0_30 || 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-400 text-xs font-semibold block">31 - 60 Days</span>
                            <h3 className="text-lg font-bold text-amber-600">LKR {(supplierAging?.days_31_60 || 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-400 text-xs font-semibold block">61 - 90 Days</span>
                            <h3 className="text-lg font-bold text-orange-600">LKR {(supplierAging?.days_61_90 || 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-400 text-xs font-semibold block">90+ Days Overdue</span>
                            <h3 className="text-lg font-bold text-red-600">LKR {(supplierAging?.days_90_plus || 0).toLocaleString()}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700">
                            Outstanding Supplier Bills Breakdown
                        </div>
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Loading supplier payables...</div>
                        ) : (supplierAging?.bills || []).length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No outstanding supplier payables found.</div>
                        ) : (
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase">
                                    <tr>
                                        <th className="p-3.5">Bill No</th>
                                        <th className="p-3.5">Supplier Name</th>
                                        <th className="p-3.5">Due Date</th>
                                        <th className="p-3.5">Age (Days)</th>
                                        <th className="p-3.5">Amount Outstanding</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {supplierAging.bills.map((b) => (
                                        <tr key={b.billId} className="hover:bg-slate-50/80">
                                            <td className="p-3.5 font-bold text-emerald-600">{b.billNumber}</td>
                                            <td className="p-3.5 font-bold text-slate-800">{b.supplierName}</td>
                                            <td className="p-3.5">{b.dueDate ? new Date(b.dueDate).toLocaleDateString() : 'N/A'}</td>
                                            <td className="p-3.5 font-bold">
                                                <span className={`px-2 py-0.5 rounded-full ${
                                                    b.diffDays > 90 ? 'bg-red-100 text-red-700' :
                                                    b.diffDays > 60 ? 'bg-orange-100 text-orange-700' :
                                                    b.diffDays > 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {b.diffDays} days
                                                </span>
                                            </td>
                                            <td className="p-3.5 font-bold text-rose-600">LKR {b.amountDue.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Customer Receivables Aging */}
            {activeTab === 'customers' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-400 text-xs font-semibold block">Total Receivables</span>
                            <h3 className="text-lg font-bold text-amber-600">LKR {(customerAging?.totalOutstanding || 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-400 text-xs font-semibold block">0 - 30 Days</span>
                            <h3 className="text-lg font-bold text-emerald-600">LKR {(customerAging?.current_0_30 || 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-400 text-xs font-semibold block">31 - 60 Days</span>
                            <h3 className="text-lg font-bold text-amber-600">LKR {(customerAging?.days_31_60 || 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-400 text-xs font-semibold block">61 - 90 Days</span>
                            <h3 className="text-lg font-bold text-orange-600">LKR {(customerAging?.days_61_90 || 0).toLocaleString()}</h3>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <span className="text-slate-400 text-xs font-semibold block">90+ Days Overdue</span>
                            <h3 className="text-lg font-bold text-red-600">LKR {(customerAging?.days_90_plus || 0).toLocaleString()}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700">
                            Project Customer Milestone Receivables Breakdown
                        </div>
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Loading customer receivables...</div>
                        ) : (customerAging?.receivables || []).length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No pending project receivables found.</div>
                        ) : (
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase">
                                    <tr>
                                        <th className="p-3.5">Order No</th>
                                        <th className="p-3.5">Project Name</th>
                                        <th className="p-3.5">Customer Name</th>
                                        <th className="p-3.5">Days Outstanding</th>
                                        <th className="p-3.5">Pending Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                                    {customerAging.receivables.map((r) => (
                                        <tr key={r.salesOrderId} className="hover:bg-slate-50/80">
                                            <td className="p-3.5 font-bold text-emerald-600">{r.orderNumber}</td>
                                            <td className="p-3.5 font-bold text-slate-800">{r.projectName}</td>
                                            <td className="p-3.5">{r.customerName}</td>
                                            <td className="p-3.5 font-bold">
                                                <span className={`px-2 py-0.5 rounded-full ${
                                                    r.diffDays > 90 ? 'bg-red-100 text-red-700' :
                                                    r.diffDays > 60 ? 'bg-orange-100 text-orange-700' :
                                                    r.diffDays > 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {r.diffDays} days
                                                </span>
                                            </td>
                                            <td className="p-3.5 font-bold text-amber-600">LKR {r.amountDue.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
