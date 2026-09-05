import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, DollarSign, FileText } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { usePayroll, usePayrollActions } from '../features/hr/useHr';
import { useState } from 'react';

const statusVariant = {
    draft: 'default', processed: 'warning', approved: 'info', paid: 'success', closed: 'default',
};

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export default function PayrollDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data } = usePayroll(id);
    const actions = usePayrollActions();
    const [confirm, setConfirm] = useState(null);

    const p = data?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    if (!p) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    const handleAction = async () => {
        if (confirm === 'approve') await actions.approve.mutateAsync(p._id);
        else if (confirm === 'pay') await actions.markPaid.mutateAsync(p._id);
        setConfirm(null);
    };

    const payslipColumns = [
        {
            key: 'employee', label: 'Employee', render: (r) => (
                <div>
                    <p className="font-medium text-sm">{r.employeeName}</p>
                    <p className="text-xs font-mono text-gray-500">{r.employeeCode}</p>
                </div>
            )
        },
        {
            key: 'attendance', label: 'Attendance', render: (r) => (
                <div className="text-xs">
                    <p>Present: {r.daysPresent}/{r.workingDays}</p>
                    {r.unpaidLeaveDays > 0 && <p className="text-red-600">Unpaid: {r.unpaidLeaveDays}</p>}
                </div>
            )
        },
        { key: 'basic', label: 'Basic', render: (r) => fmt(r.basicSalary) },
        { key: 'gross', label: 'Gross', render: (r) => fmt(r.grossEarnings) },
        { key: 'epf', label: 'EPF (8%)', render: (r) => <span className="text-red-600">-{fmt(r.epfEmployeeContribution)}</span> },
        { key: 'apit', label: 'APIT', render: (r) => r.apitAmount > 0 ? <span className="text-red-600">-{fmt(r.apitAmount)}</span> : '—' },
        { key: 'totalDed', label: 'Total Ded.', render: (r) => <span className="text-red-600">{fmt(r.totalDeductions)}</span> },
        { key: 'net', label: 'Net Pay', render: (r) => <span className="font-semibold text-primary-600">{fmt(r.netPay)}</span> },
        { key: 'payment', label: 'Status', render: (r) => <Badge variant={r.paymentStatus === 'paid' ? 'success' : 'default'}>{r.paymentStatus}</Badge> },
        {
            key: 'actions', label: '', width: '50px', render: (r) => (
                <button onClick={() => navigate(`/payroll/${p._id}/payslip/${r.employeeId}`)}
                    className="p-1.5 hover:bg-gray-100 rounded"><FileText size={16} /></button>
            )
        },
    ];

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">{p.payrollNumber} <Badge variant={statusVariant[p.status]}>{p.status}</Badge></span>}
                description={`${monthNames[p.periodMonth - 1]} ${p.periodYear} · ${p.totalEmployees} employees`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/payroll')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {p.status === 'processed' && (
                            <Button variant="primary" onClick={() => setConfirm('approve')}>
                                <CheckCircle size={16} className="mr-1.5" /> Approve
                            </Button>
                        )}
                        {p.status === 'approved' && (
                            <Button variant="primary" onClick={() => setConfirm('pay')}>
                                <DollarSign size={16} className="mr-1.5" /> Mark Paid
                            </Button>
                        )}
                    </div>
                } />

            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="p-4"><p className="text-sm text-gray-600">Gross Earnings</p><p className="text-lg font-semibold">{fmt(p.totalGrossEarnings)}</p></Card>
                <Card className="p-4"><p className="text-sm text-gray-600">Total Deductions</p><p className="text-lg font-semibold text-red-600">{fmt(p.totalDeductions)}</p></Card>
                <Card className="p-4"><p className="text-sm text-gray-600">EPF Employer (12%)</p><p className="text-lg font-semibold">{fmt(p.totalEpfEmployer)}</p></Card>
                <Card className="p-4"><p className="text-sm text-gray-600">Net Payable</p><p className="text-lg font-semibold text-primary-600">{fmt(p.totalNetPay)}</p></Card>
            </div>

            <Card>
                <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold">Payslips ({p.payslips?.length})</h3></div>
                <Table columns={payslipColumns} data={p.payslips || []} />
            </Card>

            <ConfirmDialog isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={handleAction}
                title={confirm === 'approve' ? 'Approve Payroll' : 'Mark Payroll Paid'}
                message={confirm === 'approve'
                    ? 'Approve this payroll? After approval, you can mark it paid.'
                    : 'Mark all payslips as paid? This updates payment status for all employees.'}
                loading={actions.approve.isPending || actions.markPaid.isPending} />
        </div>
    );
}