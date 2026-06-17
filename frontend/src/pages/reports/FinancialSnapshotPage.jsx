import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import KpiCard from '../../components/ui/KpiCard';
import { useFinancialSnapshot } from '../../features/reports/useReports';

export default function FinancialSnapshotPage() {
    const navigate = useNavigate();
    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data } = useFinancialSnapshot({ startDate, endDate });
    const f = data?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    return (
        <div>
            <PageHeader title="Financial Snapshot" description="Revenue vs expenses, A/R + A/P"
                actions={<Button variant="outline" onClick={() => navigate('/reports')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>} />

            <Card className="p-4 mb-4 bg-amber-50 border-amber-200">
                <p className="text-sm text-amber-900">
                    <strong>Note:</strong> This is an operational snapshot, not a formal P&L. For tax or audit purposes, use dedicated accounting software that exports from this system.
                </p>
            </Card>

            <Card className="p-4 mb-4">
                <div className="flex gap-3">
                    <div className="w-40"><Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    <div className="w-40"><Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                </div>
            </Card>

            {f && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <KpiCard label="Revenue (Invoiced)" value={fmt(f.revenue)} iconBg="bg-green-50" iconColor="text-green-600" />
                        <KpiCard label="Expenses (Billed)" value={fmt(f.expenses)} iconBg="bg-red-50" iconColor="text-red-600" />
                        <KpiCard label="Gross Profit" value={fmt(f.grossProfit)}
                            subtext={f.revenue > 0 ? `${((f.grossProfit / f.revenue) * 100).toFixed(1)}% margin` : ''} />
                        <KpiCard label="Net Cash Flow" value={fmt(f.netCashFlow)}
                            subtext={`${fmt(f.collected)} in / ${fmt(f.paid)} out`} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold mb-4">Accounts Receivable (Aging)</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between p-2 bg-green-50 rounded"><span>Current</span><span className="font-semibold">{fmt(f.accountsReceivable.current)}</span></div>
                                <div className="flex justify-between p-2 bg-yellow-50 rounded"><span>1-30 days</span><span className="font-semibold">{fmt(f.accountsReceivable.b1_30)}</span></div>
                                <div className="flex justify-between p-2 bg-amber-50 rounded"><span>31-60 days</span><span className="font-semibold">{fmt(f.accountsReceivable.b31_60)}</span></div>
                                <div className="flex justify-between p-2 bg-orange-50 rounded"><span>61-90 days</span><span className="font-semibold">{fmt(f.accountsReceivable.b61_90)}</span></div>
                                <div className="flex justify-between p-2 bg-red-50 rounded"><span>91+ days</span><span className="font-semibold text-red-600">{fmt(f.accountsReceivable.b91_plus)}</span></div>
                                <div className="flex justify-between pt-2 border-t font-bold"><span>Total</span><span>{fmt(f.accountsReceivable.total)}</span></div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="text-sm font-semibold mb-4">Accounts Payable (Aging)</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between p-2 bg-green-50 rounded"><span>Current</span><span className="font-semibold">{fmt(f.accountsPayable.current)}</span></div>
                                <div className="flex justify-between p-2 bg-yellow-50 rounded"><span>1-30 days</span><span className="font-semibold">{fmt(f.accountsPayable.b1_30)}</span></div>
                                <div className="flex justify-between p-2 bg-amber-50 rounded"><span>31-60 days</span><span className="font-semibold">{fmt(f.accountsPayable.b31_60)}</span></div>
                                <div className="flex justify-between p-2 bg-orange-50 rounded"><span>61-90 days</span><span className="font-semibold">{fmt(f.accountsPayable.b61_90)}</span></div>
                                <div className="flex justify-between p-2 bg-red-50 rounded"><span>91+ days</span><span className="font-semibold text-red-600">{fmt(f.accountsPayable.b91_plus)}</span></div>
                                <div className="flex justify-between pt-2 border-t font-bold"><span>Total</span><span>{fmt(f.accountsPayable.total)}</span></div>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}