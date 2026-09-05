import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Search } from 'lucide-react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { downloadCSV } from '../utils/exportUtils';

export default function AluProjectPnLPage() {
    const [report, setReport] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchPnLReport();
    }, []);

    const fetchPnLReport = async () => {
        setLoading(true);
        try {
            const res = await api.get('/alu/reports/project-pnl');
            setReport(res.data?.data || []);
        } catch (err) {
            toast.error('Failed to load project P&L report');
        } finally {
            setLoading(false);
        }
    };

    const filteredReport = report.filter(r =>
        (r.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.projectName || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.customerName || '').toLowerCase().includes(search.toLowerCase())
    );

    const handleDownload = () => {
        const data = filteredReport.map(r => ({
            OrderNumber: r.orderNumber,
            ProjectName: r.projectName,
            CustomerName: r.customerName,
            ContractValue: r.contractValue,
            MaterialCost: r.materialCost,
            LaborCost: r.laborCost,
            SiteExpenses: r.siteExpenses,
            TotalDirectCost: r.totalDirectCost,
            NetProfit: r.netProfit,
            NetMarginPercent: r.netMarginPercent
        }));
        downloadCSV(data, `Alueco_Project_PnL_Report_${Date.now()}.csv`);
    };

    const totalRevenue = filteredReport.reduce((s, r) => s + r.contractValue, 0);
    const totalCosts = filteredReport.reduce((s, r) => s + r.totalDirectCost, 0);
    const totalNetProfit = totalRevenue - totalCosts;
    const avgMargin = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <BarChart3 size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Project-wise Profit & Loss (P&L)</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Dedicated job costing analysis for individual project revenue, direct costs, and net margin</p>
                    </div>
                </div>
                <button
                    onClick={handleDownload}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md"
                >
                    <Download size={15} /> Export CSV Report
                </button>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Contract Revenue</span>
                    <h2 className="text-xl font-bold text-slate-800">LKR {totalRevenue.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Direct Costs</span>
                    <h2 className="text-xl font-bold text-rose-600">LKR {totalCosts.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Net Profit</span>
                    <h2 className="text-xl font-bold text-emerald-600">LKR {totalNetProfit.toLocaleString()}</h2>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                    <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Average Net Margin</span>
                    <h2 className="text-xl font-bold text-blue-600">{avgMargin.toFixed(2)}%</h2>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <input
                    type="text"
                    placeholder="Search by project name, order code or client..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-700">
                    Project P&L Performance Breakdown
                </div>
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Loading P&L breakdown...</div>
                ) : filteredReport.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No project P&L records found.</div>
                ) : (
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/60 text-slate-500 font-bold uppercase">
                            <tr>
                                <th className="p-3.5">Order No</th>
                                <th className="p-3.5">Project Name</th>
                                <th className="p-3.5">Contract Value</th>
                                <th className="p-3.5">Material Cost</th>
                                <th className="p-3.5">Labor Cost</th>
                                <th className="p-3.5">Site Expenses</th>
                                <th className="p-3.5">Total Direct Cost</th>
                                <th className="p-3.5">Net Profit</th>
                                <th className="p-3.5">Margin %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                            {filteredReport.map((r) => (
                                <tr key={r.salesOrderId} className="hover:bg-slate-50/80">
                                    <td className="p-3.5 font-bold text-emerald-600">{r.orderNumber}</td>
                                    <td className="p-3.5">
                                        <div className="font-bold text-slate-800">{r.projectName}</div>
                                        <div className="text-[11px] text-slate-400">{r.customerName}</div>
                                    </td>
                                    <td className="p-3.5 font-bold text-slate-800">LKR {r.contractValue.toLocaleString()}</td>
                                    <td className="p-3.5 text-slate-600">LKR {r.materialCost.toLocaleString()}</td>
                                    <td className="p-3.5 text-slate-600">LKR {r.laborCost.toLocaleString()}</td>
                                    <td className="p-3.5 text-slate-600">LKR {r.siteExpenses.toLocaleString()}</td>
                                    <td className="p-3.5 font-bold text-rose-600">LKR {r.totalDirectCost.toLocaleString()}</td>
                                    <td className="p-3.5 font-bold text-emerald-600">LKR {r.netProfit.toLocaleString()}</td>
                                    <td className="p-3.5 font-bold">
                                        <span className={`px-2 py-0.5 rounded-md ${
                                            r.netMarginPercent >= 20 ? 'bg-emerald-100 text-emerald-800' :
                                            r.netMarginPercent >= 10 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                        }`}>
                                            {r.netMarginPercent}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
