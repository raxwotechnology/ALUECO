import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import KpiCard from '../../components/ui/KpiCard';
import Badge from '../../components/ui/Badge';
import { useReturnsSummary, useDamagesReport } from '../../features/reports/useReports';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#8b5cf6'];

export default function ReturnsReportPage() {
    const navigate = useNavigate();
    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data: returnsData } = useReturnsSummary({ startDate, endDate });
    const { data: damagesData } = useDamagesReport({ startDate, endDate });

    const r = returnsData?.data;
    const d = damagesData?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    return (
        <div>
            <PageHeader title="Returns & Damages Reports" description="Return patterns and damage trends"
                actions={<Button variant="outline" onClick={() => navigate('/reports')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>} />

            <Card className="p-4 mb-4">
                <div className="flex gap-3">
                    <div className="w-40"><Input label="From" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                    <div className="w-40"><Input label="To" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                </div>
            </Card>

            {r && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <KpiCard label="Total Returns" value={r.summary.totalReturns || 0} />
                        <KpiCard label="Return Value" value={fmt(r.summary.totalValue)} />
                        <KpiCard label="Total Refunded" value={fmt(r.summary.totalRefunded)} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold mb-4">Top Reasons</h3>
                            {r.byReason.length === 0 ? (
                                <p className="text-center text-gray-500 py-8 text-sm">No returns in this period</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie data={r.byReason} dataKey="count" nameKey="_id" cx="50%" cy="50%"
                                            outerRadius={80} label={(e) => e._id?.replace(/_/g, ' ')}>
                                            {r.byReason.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Card>

                        <Card className="p-6">
                            <h3 className="text-sm font-semibold mb-4">Top Customers by Returns</h3>
                            {r.byCustomer.length === 0
                                ? <p className="text-center text-gray-500 py-8 text-sm">No data</p>
                                : <div className="space-y-1 text-sm">
                                    {r.byCustomer.slice(0, 10).map((c) => (
                                        <div key={c._id} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <div>
                                                <p className="font-medium">{c.customerName}</p>
                                                <p className="text-xs text-gray-500 font-mono">{c.customerCode}</p>
                                            </div>
                                            <div className="text-right">
                                                <p>{c.returnCount} returns</p>
                                                <p className="text-xs text-gray-500">{fmt(c.totalValue)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>}
                        </Card>
                    </div>
                </>
            )}

            {d && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <KpiCard label="Damage Incidents" value={d.summary.count || 0} />
                        <KpiCard label="Total Value Lost" value={fmt(d.summary.totalValue)} />
                    </div>

                    <Card>
                        <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold">Damages by Source</h3></div>
                        <Table columns={[
                            { key: '_id', label: 'Source', render: (r) => <Badge>{r._id?.replace(/_/g, ' ')}</Badge> },
                            { key: 'count', label: 'Incidents' },
                            { key: 'value', label: 'Value', render: (r) => fmt(r.value) },
                        ]} data={d.bySource} />
                    </Card>
                </>
            )}
        </div>
    );
}