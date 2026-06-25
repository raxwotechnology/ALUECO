import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { usePayslip } from '../features/hr/useHr';
import { useAuthStore } from '../store/authStore';

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

export default function PayslipDetailPage() {
    const { payrollId, employeeId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { data } = usePayslip(payrollId, employeeId);

    const d = data?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    if (!d) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    const { payslip: ps, payroll, employee } = d;

    return (
        <div>
            <PageHeader title="Payslip"
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => {
                            if (user?.role === 'employee') {
                                navigate('/dashboard');
                            } else {
                                navigate(`/payroll/${payrollId}`);
                            }
                        }}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button variant="outline" onClick={() => window.print()}>
                            <Printer size={16} className="mr-1.5" /> Print
                        </Button>
                    </div>
                } />

            <Card className="p-8 max-w-3xl">
                <div className="border-b pb-4 mb-4 flex justify-between">
                    <div>
                        <h2 className="text-xl font-bold">PAYSLIP</h2>
                        <p className="text-sm text-gray-600">{monthNames[payroll.periodMonth - 1]} {payroll.periodYear}</p>
                        <p className="text-xs text-gray-500 font-mono">{payroll.payrollNumber}</p>
                    </div>
                    <div className="text-right text-sm">
                        <p className="text-gray-500">Period</p>
                        <p>{new Date(payroll.periodStartDate).toLocaleDateString('en-LK')} — {new Date(payroll.periodEndDate).toLocaleDateString('en-LK')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Employee</p>
                        <p className="font-medium text-base">{employee.firstName} {employee.lastName}</p>
                        <p className="text-gray-600">{employee.employeeCode}</p>
                        <p className="text-gray-600">{employee.designation} · {employee.department}</p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Statutory</p>
                        <p>EPF: <span className="font-mono">{employee.epfNumber || '—'}</span></p>
                        <p>Bank: {employee.bankDetails?.bankName || '—'}</p>
                        <p>Account: <span className="font-mono">{employee.bankDetails?.accountNumber || '—'}</span></p>
                    </div>
                </div>

                <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Attendance</p>
                    <div className="grid grid-cols-5 gap-2 text-sm">
                        <div><p className="text-gray-500">Working Days</p><p className="font-semibold">{ps.workingDays}</p></div>
                        <div><p className="text-gray-500">Present</p><p className="font-semibold">{ps.daysPresent}</p></div>
                        <div><p className="text-gray-500">Absent</p><p className="font-semibold">{ps.daysAbsent}</p></div>
                        <div><p className="text-gray-500">Leave</p><p className="font-semibold">{ps.leaveDays}</p></div>
                        <div><p className="text-gray-500">OT Hours</p><p className="font-semibold">{ps.overtimeHours}</p></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Earnings</p>
                        <table className="w-full text-sm">
                            <tbody>
                                {ps.earnings?.map((e, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="py-1">{e.name}</td>
                                        <td className="py-1 text-right">{fmt(e.amount)}</td>
                                    </tr>
                                ))}
                                <tr className="font-semibold">
                                    <td className="py-2">Gross Earnings</td>
                                    <td className="py-2 text-right">{fmt(ps.grossEarnings)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Deductions</p>
                        <table className="w-full text-sm">
                            <tbody>
                                {ps.deductions?.map((d, i) => (
                                    <tr key={i} className="border-b">
                                        <td className="py-1">{d.name}</td>
                                        <td className="py-1 text-right text-red-600">-{fmt(d.amount)}</td>
                                    </tr>
                                ))}
                                <tr className="font-semibold">
                                    <td className="py-2">Total Deductions</td>
                                    <td className="py-2 text-right text-red-600">-{fmt(ps.totalDeductions)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t-2 border-gray-900 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-gray-500">NET PAY</p>
                        <p className="text-2xl font-bold text-primary-600">{fmt(ps.netPay)}</p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                        <p>EPF Employer (12%): {fmt(ps.epfEmployerContribution)}</p>
                        <p>ETF (3%): {fmt(ps.etfContribution)}</p>
                        <p className="mt-1 italic">Employer contributions (not deducted from salary)</p>
                    </div>
                </div>

                <p className="text-xs text-gray-500 mt-6 text-center">
                    This is a computer-generated payslip and does not require a signature.
                </p>
            </Card>
        </div>
    );
}