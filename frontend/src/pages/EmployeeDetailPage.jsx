import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Mail, Phone, MapPin, CreditCard, User, Briefcase } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useEmployee } from '../features/hr/useHr';

const statusVariant = {
    active: 'success', on_leave: 'warning', probation: 'info',
    suspended: 'danger', terminated: 'default', resigned: 'default',
};

export default function EmployeeDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isLoading } = useEmployee(id);
    const emp = data?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    if (isLoading || !emp) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">{emp.firstName} {emp.lastName} <Badge variant={statusVariant[emp.status]}>{emp.status?.replace(/_/g, ' ')}</Badge></span>}
                description={`${emp.employeeCode} · ${emp.designationId?.name || 'No designation'}`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/employees')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button variant="outline" onClick={() => navigate(`/employees/${id}/edit`)}>
                            <Edit size={16} className="mr-1.5" /> Edit
                        </Button>
                    </div>
                } />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <User size={18} className="text-gray-600" />
                            <h3 className="text-sm font-semibold">Personal</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><p className="text-gray-500">Full Name</p><p className="font-medium">{emp.firstName} {emp.lastName}</p></div>
                            <div><p className="text-gray-500">Gender</p><p>{emp.gender?.replace(/_/g, ' ') || '—'}</p></div>
                            <div><p className="text-gray-500">Date of Birth</p><p>{fmtDate(emp.dateOfBirth)}</p></div>
                            <div><p className="text-gray-500">NIC</p><p className="font-mono">{emp.nationalIdNumber || '—'}</p></div>
                            <div><p className="text-gray-500">Marital Status</p><p>{emp.maritalStatus || '—'}</p></div>
                            <div><p className="text-gray-500">Nationality</p><p>{emp.nationality}</p></div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Mail size={18} className="text-gray-600" />
                            <h3 className="text-sm font-semibold">Contact</h3>
                        </div>
                        <div className="space-y-2 text-sm">
                            {emp.email && <p><Mail size={12} className="inline mr-2" />{emp.email}</p>}
                            {emp.phone && <p><Phone size={12} className="inline mr-2" />{emp.phone}</p>}
                            {emp.mobile && <p><Phone size={12} className="inline mr-2" />{emp.mobile} (mobile)</p>}
                            {emp.permanentAddress?.line1 && (
                                <p><MapPin size={12} className="inline mr-2" />
                                    {emp.permanentAddress.line1}, {emp.permanentAddress.city} {emp.permanentAddress.postalCode}</p>
                            )}
                        </div>
                        {emp.emergencyContact?.name && (
                            <div className="mt-4 pt-4 border-t">
                                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Emergency Contact</p>
                                <p className="text-sm">{emp.emergencyContact.name} ({emp.emergencyContact.relationship})</p>
                                <p className="text-sm">{emp.emergencyContact.phone}</p>
                            </div>
                        )}
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Briefcase size={18} className="text-gray-600" />
                            <h3 className="text-sm font-semibold">Employment</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><p className="text-gray-500">Department</p><p>{emp.departmentId?.name || '—'}</p></div>
                            <div><p className="text-gray-500">Designation</p><p>{emp.designationId?.name || '—'}</p></div>
                            <div><p className="text-gray-500">Employment Type</p><p>{emp.employmentType?.replace(/_/g, ' ')}</p></div>
                            <div><p className="text-gray-500">Employee Category</p><p>{emp.employeeCategory || 'Permanent'}</p></div>
                            <div><p className="text-gray-500">Date of Joining</p><p>{fmtDate(emp.dateOfJoining)}</p></div>
                            {emp.probationEndDate && <div><p className="text-gray-500">Probation Ends</p><p>{fmtDate(emp.probationEndDate)}</p></div>}
                            {emp.workLocation && <div><p className="text-gray-500">Work Location</p><p>{emp.workLocation}</p></div>}
                            {emp.workShift?.name && <div><p className="text-gray-500">Shift</p><p>{emp.workShift.name}</p></div>}
                            {emp.reportsToId && <div><p className="text-gray-500">Reports To</p><p>{emp.reportsToId.firstName} {emp.reportsToId.lastName}</p></div>}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CreditCard size={18} className="text-gray-600" />
                            <h3 className="text-sm font-semibold">Statutory & Bank</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><p className="text-gray-500">EPF Number</p><p className="font-mono">{emp.epfNumber || '—'} {emp.epfRate !== undefined ? `(${emp.epfRate}%)` : ''}</p></div>
                            <div><p className="text-gray-500">ETF Number</p><p className="font-mono">{emp.etfNumber || '—'} {emp.etfRate !== undefined ? `(${emp.etfRate}%)` : ''}</p></div>
                            <div><p className="text-gray-500">TIN</p><p className="font-mono">{emp.taxRegistrationNumber || '—'}</p></div>
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Bank Details</p>
                            <p className="text-sm">{emp.bankDetails?.bankName || '—'} · {emp.bankDetails?.branchName}</p>
                            <p className="text-sm font-mono">{emp.bankDetails?.accountNumber || '—'}</p>
                            <p className="text-sm">{emp.bankDetails?.accountName}</p>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold mb-4">Compensation</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Basic Salary</span><span className="font-semibold">{fmt(emp.basicSalary)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Basic Wage Rate</span><span className="font-semibold">{fmt(emp.basicWageRate)}/hr</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">OT Monthly Cutoff</span><span className="font-semibold">{emp.otCutoffHours || 45} hours</span></div>
                            {emp.salaryStructureId && (
                                <div className="flex justify-between"><span className="text-gray-600">Structure</span><span>{emp.salaryStructureId.name}</span></div>
                            )}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold mb-4">Leave Balances</h3>
                        <div className="space-y-2 text-sm">
                            {Object.entries(emp.leaveBalances || {}).map(([k, v]) => (
                                <div key={k} className="flex justify-between">
                                    <span className="text-gray-600 capitalize">{k}</span>
                                    <span className="font-medium">{v} days</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}