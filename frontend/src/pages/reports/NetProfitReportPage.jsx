import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, FileText, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import KpiCard from '../../components/ui/KpiCard';
import Input from '../../components/ui/Input';
import { useDynamicPnLReport } from '../../features/reports/useReports';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../../features/settings/useSettings';

export default function NetProfitReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const [startDate, setStartDate] = useState(monthStart);
    const [endDate, setEndDate] = useState(today);

    const { data: pnlRes, isLoading } = useDynamicPnLReport({ startDate, endDate });
    const pnl = pnlRes?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtShort = (n) => new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

    const handleDownloadPDF = () => {
        if (!pnl) return;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.width;
        
        // 1. Header (Primary Accent)
        doc.setFillColor(16, 185, 129); // Emerald 500
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text((settings?.companyName || 'EXPORT LANKA').toUpperCase(), 14, 18);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(settings?.companyAddress || 'Colombo, Sri Lanka', 14, 25);
        
        const contactInfo = [
            settings?.companyPhone ? `Tel: ${settings.companyPhone}` : '',
            settings?.companyEmail ? `Email: ${settings.companyEmail}` : ''
        ].filter(Boolean).join(' | ') || 'info@exportlanka.com';
        doc.text(contactInfo, 14, 30);

        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('PROFIT & LOSS STATEMENT', pageWidth - 14, 20, { align: 'right' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Report Period: ${startDate} to ${endDate}`, pageWidth - 14, 28, { align: 'right' });
        doc.text(`Generated on: ${new Date().toLocaleDateString('en-LK')}`, pageWidth - 14, 33, { align: 'right' });

        // 2. Summary
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('FINANCIAL SUMMARY', 14, 52);
        
        const summaryColumns = ['Metric', 'Amount (LKR)'];
        const summaryRows = [
            ['Total Sales Revenue (Commercial Invoices)', fmtShort(pnl.revenue)],
            ['Total Direct Cost of Sales (Supplier Bills)', fmtShort(pnl.expenses.bills)],
            ['Gross Profit Margin', fmtShort(pnl.revenue - pnl.expenses.bills)],
            ['Total Operating Expenses (Petty Cash)', fmtShort(pnl.expenses.pettyCash)],
            ['Net Profit Before Tax', fmtShort(pnl.netProfit)],
            ['Net Profit Margin (%)', `${pnl.marginPercent.toFixed(2)}%`]
        ];

        autoTable(doc, {
            startY: 57,
            head: [summaryColumns],
            body: summaryRows,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { fontStyle: 'normal' },
                1: { halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 }
        });

        // 3. Petty Cash Expense Breakdowns
        const expenseY = doc.lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.text('OPERATIONAL EXPENSE BREAKDOWN (PETTY CASH)', 14, expenseY);

        const breakdownColumns = ['Category', 'Value (LKR)', '% of Total Expenses'];
        const totalExp = pnl.expenses.total || 1;
        const b = pnl.expenses.pettyBreakdown || {};
        
        const breakdownRows = [
            ['Raw Materials', fmtShort(b.rawMaterial), `${((b.rawMaterial / totalExp) * 100).toFixed(1)}%`],
            ['Chemicals', fmtShort(b.chemicals), `${((b.chemicals / totalExp) * 100).toFixed(1)}%`],
            ['Logistics & Transport', fmtShort(b.transport), `${((b.transport / totalExp) * 100).toFixed(1)}%`],
            ['Staff Welfare', fmtShort(b.welfare), `${((b.welfare / totalExp) * 100).toFixed(1)}%`],
            ['Fuel & Power', fmtShort(b.fuel), `${((b.fuel / totalExp) * 100).toFixed(1)}%`],
            ['Factory Maintenance', fmtShort(b.maintenance), `${((b.maintenance / totalExp) * 100).toFixed(1)}%`],
            ['Office & Stationary', fmtShort(b.stationary), `${((b.stationary / totalExp) * 100).toFixed(1)}%`],
            ['Wages & Salaries', fmtShort(b.miscWages), `${((b.miscWages / totalExp) * 100).toFixed(1)}%`],
            ['Firewood / Wood', fmtShort(b.wood), `${((b.wood / totalExp) * 100).toFixed(1)}%`],
            ['Packing Materials', fmtShort(b.packingMaterials), `${((b.packingMaterials / totalExp) * 100).toFixed(1)}%`],
            ['Other Miscellaneous', fmtShort(b.other), `${((b.other / totalExp) * 100).toFixed(1)}%`]
        ];

        autoTable(doc, {
            startY: expenseY + 5,
            head: [breakdownColumns],
            body: breakdownRows,
            theme: 'striped',
            headStyles: { fillColor: [52, 211, 153], textColor: [30, 41, 59], fontStyle: 'bold' },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' }
            },
            margin: { left: 14, right: 14 }
        });

        // 4. Signatures
        const bottomY = doc.internal.pageSize.height - 35;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, bottomY, 64, bottomY);
        doc.line(pageWidth - 64, bottomY, pageWidth - 14, bottomY);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Prepared By Accountant', 39, bottomY + 5, { align: 'center' });
        doc.text('Approved By Director', pageWidth - 39, bottomY + 5, { align: 'center' });

        doc.save(`Profit_Loss_Statement_${startDate}_to_${endDate}.pdf`);
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Profit & Loss (P&L) Statement" 
                description="Dynamic net profit report calculated automatically from invoices, bills, and petty cash"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/reports')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button variant="primary" onClick={handleDownloadPDF} disabled={!pnl}>
                            <Download size={16} className="mr-1.5" /> Download Report PDF
                        </Button>
                    </div>
                }
            />

            <Card className="p-5 bg-white border border-slate-100 shadow-sm rounded-2xl">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="w-full sm:w-44">
                        <Input label="From Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="w-full sm:w-44">
                        <Input label="To Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>
            </Card>

            {isLoading ? (
                <div className="py-20 text-center text-slate-400 animate-pulse">Calculating net profit...</div>
            ) : !pnl ? (
                <div className="py-20 text-center text-slate-400 border border-dashed rounded-2xl">No data found in selected period</div>
            ) : (
                <>
                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <KpiCard label="Revenue (Sales)" value={fmt(pnl.revenue)} iconBg="bg-blue-50" iconColor="text-blue-600" />
                        <KpiCard label="Direct Bills (Supplier)" value={fmt(pnl.expenses.bills)} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
                        <KpiCard label="Petty Cash Cost" value={fmt(pnl.expenses.pettyCash)} iconBg="bg-orange-50" iconColor="text-orange-600" />
                        <KpiCard 
                            label="Net Profit" 
                            value={fmt(pnl.netProfit)} 
                            iconBg={pnl.netProfit >= 0 ? "bg-emerald-50" : "bg-red-50"} 
                            iconColor={pnl.netProfit >= 0 ? "text-emerald-600" : "text-red-600"} 
                        />
                        <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profit Margin</span>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`text-2xl font-black font-mono ${pnl.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                    {pnl.marginPercent.toFixed(1)}%
                                </span>
                                {pnl.netProfit >= 0 ? (
                                    <TrendingUp className="text-emerald-500" size={20} />
                                ) : (
                                    <TrendingDown className="text-red-500" size={20} />
                                )}
                            </div>
                            <span className="text-[10px] text-slate-400 mt-2 font-medium">Net Profit / Revenue</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* P&L Statement Structure */}
                        <Card className="lg:col-span-2 p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-base font-bold text-slate-800 border-b pb-3 mb-4">Profit & Loss Statement (Consolidated)</h3>
                            <div className="space-y-4 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                                    <span className="font-semibold text-slate-700">1. Total Revenue (Sales)</span>
                                    <span className="font-mono text-slate-900 font-bold">{fmt(pnl.revenue)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 pl-4 text-slate-600">
                                    <span>Cost of Sales (Approved Supplier Bills)</span>
                                    <span className="font-mono font-medium">({fmt(pnl.expenses.bills)})</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100 bg-slate-50/50 px-2 rounded-xl">
                                    <span className="font-bold text-slate-800">Gross Margin</span>
                                    <span className="font-mono text-slate-900 font-black">{fmt(pnl.revenue - pnl.expenses.bills)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-50 pl-4 text-slate-600">
                                    <span>Operating Expenses (Petty Cash Payments)</span>
                                    <span className="font-mono font-medium">({fmt(pnl.expenses.pettyCash)})</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-t-2 border-double border-slate-800 bg-emerald-50/40 px-3 rounded-xl mt-6">
                                    <span className="text-base font-black text-slate-800">Net Profit / Loss</span>
                                    <span className={`font-mono text-lg font-black ${pnl.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                        {fmt(pnl.netProfit)}
                                    </span>
                                </div>
                            </div>
                        </Card>

                        {/* Petty Cash Expense Categories */}
                        <Card className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                            <h3 className="text-base font-bold text-slate-800 border-b pb-3 mb-4">Operating Expense breakdown</h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 text-sm">
                                {Object.entries(pnl.expenses.pettyBreakdown).map(([key, value]) => {
                                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                    const percent = pnl.expenses.total > 0 ? (value / pnl.expenses.total) * 100 : 0;
                                    return (
                                        <div key={key} className="space-y-1">
                                            <div className="flex justify-between text-slate-600 font-medium">
                                                <span>{label}</span>
                                                <span className="font-mono font-bold text-slate-800">{fmt(value)}</span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-indigo-600 h-full" style={{ width: `${percent}%` }}></div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 text-right font-semibold">{percent.toFixed(1)}% of total expenses</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
