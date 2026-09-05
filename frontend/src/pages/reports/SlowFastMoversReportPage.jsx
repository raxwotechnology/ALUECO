import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, XCircle } from 'lucide-react';

import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { useSlowFastMovers } from '../../features/reports/useReports';

const classBadges = {
    A: { variant: 'success', icon: TrendingUp, label: 'Fast Mover (A)' },
    B: { variant: 'info', icon: Minus, label: 'Medium (B)' },
    C: { variant: 'warning', icon: TrendingDown, label: 'Slow (C)' },
    D: { variant: 'danger', icon: XCircle, label: 'Dead (D)' },
};

export default function SlowFastMoversReportPage() {
    const navigate = useNavigate();
    const [days, setDays] = useState(90);
    const [classFilter, setClassFilter] = useState('all');
    const { data, isLoading } = useSlowFastMovers({ days });

    const report = data?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const filteredItems = !report ? [] : (
        classFilter === 'all'
            ? [...report.classification.A, ...report.classification.B, ...report.classification.C, ...report.classification.D]
            : report.classification[classFilter] || []
    );

    const columns = [
        { key: 'productCode', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.productCode}</span> },
        { key: 'productName', label: 'Product', render: (r) => <span className="font-medium">{r.productName}</span> },
        {
            key: 'abcClass', label: 'Class', render: (r) => {
                const b = classBadges[r.abcClass];
                return <Badge variant={b.variant}>{r.abcClass}</Badge>;
            }
        },
        { key: 'unitsSold', label: 'Units Sold' },
        { key: 'revenue', label: 'Revenue', render: (r) => fmt(r.revenue) },
        { key: 'cumulativePercent', label: 'Cumulative %', render: (r) => r.cumulativePercent ? `${r.cumulativePercent}%` : '—' },
    ];

    return (
        <div>
            <PageHeader title="Slow & Fast Movers (ABC Analysis)"
                description="Products classified by revenue contribution"
                actions={<Button variant="outline" onClick={() => navigate('/reports')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>} />

            <Card className="p-4 mb-4">
                <div className="flex gap-3 items-end">
                    <div className="w-36">
                        <Input label="Period (days)" type="number" min="7" max="365" value={days}
                            onChange={(e) => setDays(e.target.value)} />
                    </div>
                </div>
            </Card>

            {isLoading || !report ? (
                <div className="py-16 text-center text-gray-500">Loading...</div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {Object.entries(classBadges).map(([key, b]) => {
                            const count = report.summary[
                                key === 'A' ? 'fastMovers' : key === 'B' ? 'mediumMovers' : key === 'C' ? 'slowMovers' : 'deadStock'
                            ];
                            return (
                                <Card key={key} className="p-4 cursor-pointer hover:shadow-md" onClick={() => setClassFilter(classFilter === key ? 'all' : key)}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${key === 'A' ? 'bg-green-50 text-green-600'
                                                : key === 'B' ? 'bg-blue-50 text-blue-600'
                                                    : key === 'C' ? 'bg-amber-50 text-amber-600'
                                                        : 'bg-red-50 text-red-600'
                                            }`}>
                                            <b.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-600">{b.label}</p>
                                            <p className="text-xl font-semibold">{count}</p>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
                        <p className="text-sm text-blue-900">
                            <strong>ABC Analysis (Pareto):</strong> Class A = top 80% of revenue (focus here — stock more, discount less). Class B = next 15%. Class C = bottom 5% (review pricing or discontinue). Class D = zero sales in the last {days} days (dead stock — consider clearance).
                        </p>
                    </Card>

                    <Card>
                        {filteredItems.length === 0
                            ? <div className="py-16 text-center text-gray-500">No products in this class</div>
                            : <Table columns={columns} data={filteredItems} />}
                    </Card>
                </>
            )}
        </div>
    );
}