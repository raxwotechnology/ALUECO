import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Eye, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import { usePayrolls, useProcessPayroll } from '../features/hr/useHr';

const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const statusVariant = {
    draft: 'default', processed: 'warning', approved: 'info', paid: 'success', closed: 'default',
};

export default function PayrollsPage() {
    const navigate = useNavigate();
    const [year, setYear] = useState(new Date().getFullYear());
    const { data } = usePayrolls({ year });
    const processM = useProcessPayroll();

    const [isProcessOpen, setIsProcessOpen] = useState(false);
    const [processMonth, setProcessMonth] = useState(new Date().getMonth() + 1);
    const [processYear, setProcessYear] = useState(new Date().getFullYear());
    const [overtimeRate, setOvertimeRate] = useState(0);

    const payrolls = data?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const submitProcess = async () => {
        try {
            const result = await processM.mutateAsync({
                periodMonth: +processMonth,
                periodYear: +processYear,
                overtimeRatePerHour: +overtimeRate || 0,
            });
            setIsProcessOpen(false);
            navigate(`/payroll/${result.data._id}`);
        } catch { }
    };

    const columns = [
        { key: 'payrollNumber', label: 'Ref', render: (r) => <span className="font-mono text-xs">{r.payrollNumber}</span> },
        { key: 'period', label: 'Period', render: (r) => `${months[r.periodMonth - 1]?.label} ${r.periodYear}` },
        { key: 'employees', label: 'Employees', render: (r) => r.totalEmployees },
        { key: 'gross', label: 'Gross', render: (r) => fmt(r.totalGrossEarnings) },
        { key: 'deductions', label: 'Deductions', render: (r) => fmt(r.totalDeductions) },
        { key: 'net', label: 'Net Pay', render: (r) => <span className="font-semibold">{fmt(r.totalNetPay)}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
        {
            key: 'actions', label: '', width: '50px', render: (r) => (
                <button onClick={() => navigate(`/payroll/${r._id}`)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={16} /></button>
            )
        },
    ];

    return (
        <div>
            <PageHeader title="Payroll" description="Monthly payroll processing"
                actions={<Button variant="primary" onClick={() => setIsProcessOpen(true)}>
                    <Play size={16} className="mr-1.5" /> Process Payroll
                </Button>} />

            <Card>
                <div className="p-4 border-b flex gap-3">
                    <div className="w-32">
                        <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
                    </div>
                </div>
                {payrolls.length === 0
                    ? <EmptyState icon={DollarSign} title={`No payroll for ${year}`}
                        description="Process monthly payroll to generate payslips" />
                    : <Table columns={columns} data={payrolls} onRowClick={(r) => navigate(`/payroll/${r._id}`)} />}
            </Card>

            <Modal isOpen={isProcessOpen} onClose={() => setIsProcessOpen(false)} title="Process Monthly Payroll" size="md">
                <div className="p-6 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
                        <strong>Before processing:</strong> ensure attendance for this month is marked and leaves are approved.
                        EPF 8% employee + 12% employer, ETF 3%, and APIT income tax will be auto-calculated.
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Month" required options={months}
                            value={processMonth} onChange={(e) => setProcessMonth(e.target.value)} />
                        <Input label="Year" required type="number" value={processYear}
                            onChange={(e) => setProcessYear(e.target.value)} />
                    </div>
                    <Input label="Overtime Rate (LKR per hour)" type="number" step="0.01" min="0"
                        value={overtimeRate} onChange={(e) => setOvertimeRate(e.target.value)}
                        placeholder="0 = no overtime calculation" />
                    <p className="text-xs text-gray-500">
                        Tip: Common rates are 1.5× hourly basic. For a LKR 50,000/month basic, hourly is ~240, so OT at 1.5× = ~360.
                    </p>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsProcessOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submitProcess} loading={processM.isPending}>Process</Button>
                </div>
            </Modal>
        </div>
    );
}