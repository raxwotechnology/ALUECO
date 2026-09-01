import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Target, DollarSign, Calendar, TrendingUp, TrendingDown,
    Percent, Plus, AlertCircle, BarChart3, HelpCircle, CheckCircle2, XCircle
} from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import KpiCard from '../../components/ui/KpiCard';
import { useVarianceReport, useSalesComparison, useFinancialTargets, useSetTarget } from '../../features/reports/useReports';
import toast from 'react-hot-toast';

const monthsList = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
];

const yearsList = [
    { value: 2025, label: '2025' },
    { value: 2026, label: '2026' },
    { value: 2027, label: '2027' }
];

export default function VarianceComparisonPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('variance'); // 'variance' or 'comparison'

    // Variance Filter State
    const [varYear, setVarYear] = useState(new Date().getFullYear());
    const [varMonth, setVarMonth] = useState(new Date().getMonth() + 1);

    // Target Form State
    const [targetYear, setTargetYear] = useState(new Date().getFullYear());
    const [targetMonth, setTargetMonth] = useState(new Date().getMonth() + 1);
    const [targetRevenue, setTargetRevenue] = useState('');
    const [targetNotes, setTargetNotes] = useState('');

    // Comparison Filter State
    const [yearA, setYearA] = useState(new Date().getFullYear());
    const [monthA, setMonthA] = useState(new Date().getMonth()); // default to previous month
    const [yearB, setYearB] = useState(new Date().getFullYear());
    const [monthB, setMonthB] = useState(new Date().getMonth() + 1); // default to current month

    // Queries & Mutations
    const { data: varianceRes, isLoading: isLoadingVariance, refetch: refetchVariance } = useVarianceReport({ year: varYear, month: varMonth });
    const { data: comparisonRes, isLoading: isLoadingComparison, refetch: refetchComparison } = useSalesComparison({ yearA, monthA: monthA || 1, yearB, monthB });
    const { data: targetsRes } = useFinancialTargets();
    const setTargetMutation = useSetTarget();

    const varianceData = varianceRes?.data;
    const comparisonData = comparisonRes?.data;
    const targetsList = targetsRes?.data || [];

    const handleSetTarget = async (e) => {
        e.preventDefault();
        if (!targetRevenue || isNaN(targetRevenue) || Number(targetRevenue) < 0) {
            toast.error('Please enter a valid revenue target');
            return;
        }

        try {
            await setTargetMutation.mutateAsync({
                year: Number(targetYear),
                month: Number(targetMonth),
                revenueTarget: Number(targetRevenue),
                notes: targetNotes
            });
            toast.success('Monthly revenue target updated successfully');
            setTargetRevenue('');
            setTargetNotes('');
            refetchVariance();
        } catch (error) {
            toast.error(error.message || 'Failed to update target');
        }
    };

    const fmtLKR = (val) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(val || 0);
    };

    const getMilestoneBadge = (status) => {
        switch (status) {
            case 'Target Achieved':
                return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200 inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Target Achieved</span>;
            case 'On Track':
                return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-1.5"><TrendingUp size={14} /> On Track</span>;
            case 'Behind':
                return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-200 inline-flex items-center gap-1.5"><AlertCircle size={14} /> Behind Target</span>;
            case 'Target Missed':
                return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 inline-flex items-center gap-1.5"><XCircle size={14} /> Target Missed</span>;
            default:
                return <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200 inline-flex items-center gap-1.5"><HelpCircle size={14} /> {status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Variance & Sales Comparator"
                description="Live financial targets tracker and dual-month performance comparator"
                actions={
                    <Button variant="outline" onClick={() => navigate('/reports')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back
                    </Button>
                }
            />

            {/* Navigation Tabs */}
            <div className="border-b border-gray-200 bg-white px-4 py-2 rounded-xl flex gap-4">
                <button
                    onClick={() => setActiveTab('variance')}
                    className={`pb-2 pt-1 px-4 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'variance'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <Target size={16} />
                        Target vs Actual Variance
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('comparison')}
                    className={`pb-2 pt-1 px-4 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'comparison'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <div className="flex items-center gap-2">
                        <BarChart3 size={16} />
                        Month-to-Month Comparator
                    </div>
                </button>
            </div>

            {activeTab === 'variance' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: Filter & Variance Report Details */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="p-5">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-base font-bold text-gray-800">Select Reporting Month</h3>
                                <div className="flex gap-3">
                                    <div className="w-36">
                                        <Select
                                            options={yearsList}
                                            value={varYear}
                                            onChange={(e) => setVarYear(Number(e.target.value))}
                                        />
                                    </div>
                                    <div className="w-44">
                                        <Select
                                            options={monthsList}
                                            value={varMonth}
                                            onChange={(e) => setVarMonth(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {isLoadingVariance ? (
                                <div className="py-12 text-center text-gray-500">Loading variance reports...</div>
                            ) : varianceData ? (
                                <div className="space-y-6">
                                    {/* Financial KPIs */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        <KpiCard
                                            label="Target Revenue"
                                            value={fmtLKR(varianceData.targetRevenue)}
                                            iconBg="bg-indigo-50"
                                            iconColor="text-indigo-600"
                                        />
                                        <KpiCard
                                            label="Actual Revenue"
                                            value={fmtLKR(varianceData.actualRevenue)}
                                            iconBg="bg-emerald-50"
                                            iconColor="text-emerald-600"
                                            subtext={`${varianceData.invoiceCount} commercial invoices`}
                                        />
                                        <KpiCard
                                            label="Revenue Variance"
                                            value={fmtLKR(varianceData.revenueVariance)}
                                            iconBg={varianceData.revenueVariance >= 0 ? "bg-green-50" : "bg-rose-50"}
                                            iconColor={varianceData.revenueVariance >= 0 ? "text-green-600" : "text-rose-600"}
                                            subtext={varianceData.revenueVariance >= 0 ? "Above target" : "Below target"}
                                        />
                                    </div>

                                    {/* Second Row KPIs */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <KpiCard
                                            label="Actual Operating Expenses"
                                            value={fmtLKR(varianceData.actualExpenses)}
                                            iconBg="bg-amber-50"
                                            iconColor="text-amber-600"
                                            subtext="Aggregated Daily P&L Expenses"
                                        />
                                        <KpiCard
                                            label="Net Profit / Loss"
                                            value={fmtLKR(varianceData.netProfitLoss)}
                                            iconBg={varianceData.netProfitLoss >= 0 ? "bg-teal-50" : "bg-red-50"}
                                            iconColor={varianceData.netProfitLoss >= 0 ? "text-teal-600" : "text-red-600"}
                                            subtext="Revenue minus Operating Expenses"
                                        />
                                    </div>

                                    {/* Progress Meter */}
                                    <div className="border border-gray-100 rounded-xl p-5 bg-slate-50/50">
                                        <div className="flex justify-between items-center mb-3">
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Compliance progress meter</h4>
                                                <p className="text-2xl font-black text-gray-900 mt-1">{varianceData.percentageAchieved}% Achieved</p>
                                            </div>
                                            <div>
                                                {getMilestoneBadge(varianceData.milestoneStatus)}
                                            </div>
                                        </div>

                                        <div className="w-full bg-gray-200 rounded-full h-3.5 mb-2 overflow-hidden shadow-inner">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    varianceData.percentageAchieved >= 100
                                                        ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                                                        : varianceData.percentageAchieved >= 70
                                                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                                        : varianceData.percentageAchieved >= 40
                                                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                                        : 'bg-gradient-to-r from-rose-500 to-red-600'
                                                }`}
                                                style={{ width: `${Math.min(varianceData.percentageAchieved, 100)}%` }}
                                            ></div>
                                        </div>
                                        
                                        {varianceData.targetNotes && (
                                            <p className="text-xs text-gray-500 mt-3 italic">
                                                <strong>Target Note:</strong> "{varianceData.targetNotes}"
                                            </p>
                                        )}
                                    </div>

                                    {/* Expense Breakdown Grid */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 mb-3">Operating Expense Breakdown (Daily P&L)</h4>
                                        <div className="overflow-x-auto border border-gray-200 rounded-xl">
                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                <thead className="bg-gray-50 text-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-semibold">Expense Category</th>
                                                        <th className="px-4 py-3 text-right font-semibold">Total Amount (LKR)</th>
                                                        <th className="px-4 py-3 text-right font-semibold">% of Total Expenses</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                                                    {[
                                                        { name: 'Raw Material Cost', val: varianceData.expensesBreakdown.rawMaterial },
                                                        { name: 'Labour Salary', val: varianceData.expensesBreakdown.labourSalary },
                                                        { name: 'Supervisor & QC Wages', val: varianceData.expensesBreakdown.supervisorQC },
                                                        { name: 'Electricity Bills', val: varianceData.expensesBreakdown.electricity },
                                                        { name: 'Firewood Cost', val: varianceData.expensesBreakdown.firewood },
                                                        { name: 'Packing Materials', val: varianceData.expensesBreakdown.packing },
                                                        { name: 'Transport & Logistics', val: varianceData.expensesBreakdown.transport },
                                                        { name: 'Communication & Admin', val: varianceData.expensesBreakdown.communication },
                                                        { name: 'Other Overheads', val: varianceData.expensesBreakdown.other }
                                                    ].filter(x => x.val > 0 || varianceData.actualExpenses === 0).map((row, i) => (
                                                        <tr key={i} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-3 text-left font-medium">{row.name}</td>
                                                            <td className="px-4 py-3 text-right font-bold">{fmtLKR(row.val)}</td>
                                                            <td className="px-4 py-3 text-right text-gray-500">
                                                                {varianceData.actualExpenses > 0
                                                                    ? `${((row.val / varianceData.actualExpenses) * 100).toFixed(1)}%`
                                                                    : '0.0%'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-slate-50 font-bold text-gray-900 border-t border-gray-200">
                                                        <td className="px-4 py-3 text-left">Total Expenses</td>
                                                        <td className="px-4 py-3 text-right text-red-600">{fmtLKR(varianceData.actualExpenses)}</td>
                                                        <td className="px-4 py-3 text-right">100.0%</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 text-center text-gray-500">No variance records found for this month</div>
                            )}
                        </Card>
                    </div>

                    {/* Right Column: Set Target Form & Targets List */}
                    <div className="space-y-6">
                        <Card className="p-5">
                            <h3 className="text-base font-bold text-gray-800 mb-4 inline-flex items-center gap-2"><Target className="text-emerald-600" size={18} /> Set Monthly Revenue Target</h3>
                            <form onSubmit={handleSetTarget} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <Select
                                        label="Year"
                                        options={yearsList}
                                        value={targetYear}
                                        onChange={(e) => setTargetYear(Number(e.target.value))}
                                    />
                                    <Select
                                        label="Month"
                                        options={monthsList}
                                        value={targetMonth}
                                        onChange={(e) => setTargetMonth(Number(e.target.value))}
                                    />
                                </div>
                                <Input
                                    label="Target Revenue (LKR)"
                                    type="number"
                                    placeholder="e.g. 5000000"
                                    required
                                    value={targetRevenue}
                                    onChange={(e) => setTargetRevenue(e.target.value)}
                                />
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-700">Target Notes / Milestones</label>
                                    <textarea
                                        className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-emerald-600"
                                        rows={3}
                                        placeholder="Note key assumptions, targets or details..."
                                        value={targetNotes}
                                        onChange={(e) => setTargetNotes(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" fullWidth loading={setTargetMutation.isPending}>
                                    <Plus size={16} className="mr-1.5" /> Save Target
                                </Button>
                            </form>
                        </Card>

                        <Card className="p-5 max-h-[480px] overflow-y-auto">
                            <h3 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">Configured Targets History</h3>
                            {targetsList.length === 0 ? (
                                <p className="text-xs text-gray-500 py-4 text-center">No targets configured yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {targetsList.map((t) => (
                                        <div key={t._id} className="p-3 border rounded-lg bg-slate-50 flex justify-between items-center text-xs">
                                            <div>
                                                <p className="font-bold text-gray-700">
                                                    {monthsList.find(m => m.value === t.month)?.label} {t.year}
                                                </p>
                                                {t.notes && <p className="text-[10px] text-gray-500 mt-1 italic">"{t.notes}"</p>}
                                            </div>
                                            <p className="font-extrabold text-emerald-600 text-right">{fmtLKR(t.revenueTarget)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                </div>
            ) : (
                /* Tab 2: Month-to-Month Comparator */
                <Card className="p-6">
                    <h3 className="text-base font-bold text-gray-800 mb-4">Dual Month-to-Month Comparator</h3>
                    
                    {/* Filters Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 border rounded-xl mb-6">
                        {/* Month A Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Reference Month A</label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Select
                                        options={yearsList}
                                        value={yearA}
                                        onChange={(e) => setYearA(Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex-[1.5]">
                                    <Select
                                        options={monthsList}
                                        value={monthA}
                                        onChange={(e) => setMonthA(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Month B Selector */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Comparison Month B</label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <Select
                                        options={yearsList}
                                        value={yearB}
                                        onChange={(e) => setYearB(Number(e.target.value))}
                                    />
                                </div>
                                <div className="flex-[1.5]">
                                    <Select
                                        options={monthsList}
                                        value={monthB}
                                        onChange={(e) => setMonthB(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {isLoadingComparison ? (
                        <div className="py-12 text-center text-gray-500">Calculating dual month analytics...</div>
                    ) : comparisonData ? (
                        <div className="space-y-8">
                            {/* Comparison Matrix Table */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-800 mb-3 border-b pb-2">Financial KPI Comparison</h4>
                                <div className="overflow-x-auto border rounded-xl">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50 text-gray-700">
                                            <tr>
                                                <th className="px-5 py-3 text-left font-semibold">Performance Metric</th>
                                                <th className="px-5 py-3 text-right font-semibold">
                                                    Month A ({monthsList.find(m => m.value === comparisonData.monthA.month)?.label} {comparisonData.monthA.year})
                                                </th>
                                                <th className="px-5 py-3 text-right font-semibold">
                                                    Month B ({monthsList.find(m => m.value === comparisonData.monthB.month)?.label} {comparisonData.monthB.year})
                                                </th>
                                                <th className="px-5 py-3 text-right font-semibold">Variance / Delta</th>
                                                <th className="px-5 py-3 text-center font-semibold">Growth Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white text-gray-700">
                                            {/* Revenue Row */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="px-5 py-4 text-left font-medium">Verified Commercial Revenue</td>
                                                <td className="px-5 py-4 text-right font-bold">{fmtLKR(comparisonData.monthA.revenue)}</td>
                                                <td className="px-5 py-4 text-right font-bold">{fmtLKR(comparisonData.monthB.revenue)}</td>
                                                <td className="px-5 py-4 text-right font-bold text-gray-700">
                                                    {fmtLKR(comparisonData.monthB.revenue - comparisonData.monthA.revenue)}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-full ${
                                                        comparisonData.comparisons.revenueGrowthPercent >= 0
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-rose-100 text-rose-800'
                                                    }`}>
                                                        {comparisonData.comparisons.revenueGrowthPercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                        {comparisonData.comparisons.revenueGrowthPercent}%
                                                    </span>
                                                </td>
                                            </tr>
                                            {/* Expenses Row */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="px-5 py-4 text-left font-medium">Billed Operations Expenses</td>
                                                <td className="px-5 py-4 text-right font-bold text-red-600">{fmtLKR(comparisonData.monthA.expenses)}</td>
                                                <td className="px-5 py-4 text-right font-bold text-red-600">{fmtLKR(comparisonData.monthB.expenses)}</td>
                                                <td className="px-5 py-4 text-right font-bold text-gray-700">
                                                    {fmtLKR(comparisonData.monthB.expenses - comparisonData.monthA.expenses)}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="text-gray-500 font-medium text-xs">
                                                        {comparisonData.monthA.expenses > 0
                                                            ? `${(((comparisonData.monthB.expenses - comparisonData.monthA.expenses) / comparisonData.monthA.expenses) * 100).toFixed(1)}%`
                                                            : '0.0%'}
                                                    </span>
                                                </td>
                                            </tr>
                                            {/* Net Profit Row */}
                                            <tr className="hover:bg-slate-50/50 bg-slate-50/30">
                                                <td className="px-5 py-4 text-left font-bold">Net Profit / Loss</td>
                                                <td className="px-5 py-4 text-right font-black text-teal-600">{fmtLKR(comparisonData.monthA.netProfit)}</td>
                                                <td className="px-5 py-4 text-right font-black text-teal-600">{fmtLKR(comparisonData.monthB.netProfit)}</td>
                                                <td className="px-5 py-4 text-right font-bold text-gray-800">
                                                    {fmtLKR(comparisonData.monthB.netProfit - comparisonData.monthA.netProfit)}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-1 rounded-full ${
                                                        comparisonData.comparisons.netProfitGrowthPercent >= 0
                                                            ? 'bg-teal-100 text-teal-800'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {comparisonData.comparisons.netProfitGrowthPercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                        {comparisonData.comparisons.netProfitGrowthPercent}%
                                                    </span>
                                                </td>
                                            </tr>
                                            {/* Invoice Count Row */}
                                            <tr className="hover:bg-slate-50/50">
                                                <td className="px-5 py-4 text-left font-medium">Invoiced Orders Volume</td>
                                                <td className="px-5 py-4 text-right font-semibold">{comparisonData.monthA.invoiceCount}</td>
                                                <td className="px-5 py-4 text-right font-semibold">{comparisonData.monthB.invoiceCount}</td>
                                                <td className="px-5 py-4 text-right font-bold text-gray-700">
                                                    {comparisonData.comparisons.invoiceCountChange >= 0 ? '+' : ''}{comparisonData.comparisons.invoiceCountChange}
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="text-gray-500 text-xs">orders</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Dual Month Products Breakdowns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Month A Top Products */}
                                <Card className="p-4 border border-gray-100 bg-slate-50/50">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Top Products Sold in Month A</h4>
                                    {comparisonData.monthA.topProducts.length === 0 ? (
                                        <p className="text-xs text-gray-400 py-6 text-center">No sales logged in Month A.</p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {comparisonData.monthA.topProducts.map((prod, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-2.5 bg-white border border-gray-100 rounded-lg text-sm">
                                                    <span className="font-semibold text-gray-700">{prod.name}</span>
                                                    <span className="font-bold text-gray-900 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs">{prod.quantity} kg</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>

                                {/* Month B Top Products */}
                                <Card className="p-4 border border-gray-100 bg-slate-50/50">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Top Products Sold in Month B</h4>
                                    {comparisonData.monthB.topProducts.length === 0 ? (
                                        <p className="text-xs text-gray-400 py-6 text-center">No sales logged in Month B.</p>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {comparisonData.monthB.topProducts.map((prod, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-2.5 bg-white border border-gray-100 rounded-lg text-sm">
                                                    <span className="font-semibold text-gray-700">{prod.name}</span>
                                                    <span className="font-bold text-gray-900 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-xs">{prod.quantity} kg</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12 text-center text-gray-500">No comparison data loaded</div>
                    )}
                </Card>
            )}
        </div>
    );
}
