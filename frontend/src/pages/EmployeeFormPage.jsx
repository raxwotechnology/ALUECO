import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import {
    useEmployee, useCreateEmployee, useUpdateEmployee,
    useDepartments, useDesignations, useShifts, useSalaryStructures, useLeaveStructures,
} from '../features/hr/useHr';

const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'contact', label: 'Contact' },
    { id: 'employment', label: 'Employment' },
    { id: 'statutory', label: 'Statutory & Bank' },
    { id: 'compensation', label: 'Compensation' },
];

export default function EmployeeFormPage() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();
    const [tab, setTab] = useState('basic');

    const createMutation = useCreateEmployee();
    const updateMutation = useUpdateEmployee();
    const { data: existingData } = useEmployee(id);
    const { data: deptsData } = useDepartments();
    const { data: designationsData } = useDesignations();
    const { data: shiftsData } = useShifts();
    const { data: structuresData } = useSalaryStructures({ isActive: 'true' });
    const { data: leavesData } = useLeaveStructures({ isActive: 'true' });

    const [form, setForm] = useState({
        firstName: '', lastName: '', gender: '', dateOfBirth: '', nationalIdNumber: '',
        maritalStatus: '', nationality: 'Sri Lankan', bloodGroup: '',
        email: '', phone: '', mobile: '',
        permanentAddress: { line1: '', city: '', postalCode: '' },
        currentAddress: { line1: '', city: '', postalCode: '' },
        emergencyContact: { name: '', relationship: '', phone: '' },
        departmentId: '', designationId: '', reportsToId: '',
        employmentType: 'permanent', dateOfJoining: '', probationEndDate: '',
        workLocation: '', workShift: '',
        epfNumber: '', etfNumber: '', taxRegistrationNumber: '',
        bankDetails: { bankName: '', branchName: '', accountNumber: '', accountName: '' },
        salaryStructureId: '', leaveStructureId: '', basicSalary: 0,
        status: 'active',
        notes: '',
        employeeCategory: 'Permanent',
        epfRate: 8,
        etfRate: 3,
        basicWageRate: 0,
        otCutoffHours: 45,
    });

    useEffect(() => {
        if (isEdit && existingData?.data) {
            const e = existingData.data;
            setForm({
                ...form,
                firstName: e.firstName || '', lastName: e.lastName || '',
                gender: e.gender || '', dateOfBirth: e.dateOfBirth ? e.dateOfBirth.slice(0, 10) : '',
                nationalIdNumber: e.nationalIdNumber || '',
                maritalStatus: e.maritalStatus || '', nationality: e.nationality || 'Sri Lankan',
                bloodGroup: e.bloodGroup || '',
                email: e.email || '', phone: e.phone || '', mobile: e.mobile || '',
                permanentAddress: e.permanentAddress || { line1: '', city: '', postalCode: '' },
                currentAddress: e.currentAddress || { line1: '', city: '', postalCode: '' },
                emergencyContact: e.emergencyContact || { name: '', relationship: '', phone: '' },
                departmentId: e.departmentId?._id || '', designationId: e.designationId?._id || '',
                reportsToId: e.reportsToId?._id || '',
                employmentType: e.employmentType || 'permanent',
                dateOfJoining: e.dateOfJoining ? e.dateOfJoining.slice(0, 10) : '',
                probationEndDate: e.probationEndDate ? e.probationEndDate.slice(0, 10) : '',
                workLocation: e.workLocation || '', workShift: e.workShift?._id || '',
                epfNumber: e.epfNumber || '', etfNumber: e.etfNumber || '',
                taxRegistrationNumber: e.taxRegistrationNumber || '',
                bankDetails: e.bankDetails || { bankName: '', branchName: '', accountNumber: '', accountName: '' },
                salaryStructureId: e.salaryStructureId?._id || '',
                leaveStructureId: e.leaveStructureId?._id || '',
                basicSalary: e.basicSalary || 0,
                status: e.status || 'active',
                notes: e.notes || '',
                employeeCategory: e.employeeCategory || 'Permanent',
                epfRate: e.epfRate !== undefined ? e.epfRate : 8,
                etfRate: e.etfRate !== undefined ? e.etfRate : 3,
                basicWageRate: e.basicWageRate || 0,
                otCutoffHours: e.otCutoffHours !== undefined ? e.otCutoffHours : 45,
            });
        }
    }, [isEdit, existingData]);

    const update = (path, value) => {
        setForm((prev) => {
            const copy = { ...prev };
            const parts = path.split('.');
            if (parts.length === 1) copy[parts[0]] = value;
            else {
                copy[parts[0]] = { ...copy[parts[0]], [parts[1]]: value };
            }
            return copy;
        });
    };

    const submit = async () => {
        if (!form.firstName || !form.lastName || !form.dateOfJoining) {
            toast.error('First name, last name and date of joining are required');
            setTab('basic');
            return;
        }
        try {
            const payload = {
                ...form,
                basicSalary: +form.basicSalary || 0,
                departmentId: form.departmentId || undefined,
                designationId: form.designationId || undefined,
                reportsToId: form.reportsToId || undefined,
                workShift: form.workShift || undefined,
                salaryStructureId: form.salaryStructureId || undefined,
                leaveStructureId: form.leaveStructureId || undefined,
            };
            if (isEdit) {
                await updateMutation.mutateAsync({ id, data: payload });
                navigate(`/employees/${id}`);
            } else {
                const result = await createMutation.mutateAsync(payload);
                navigate(`/employees/${result.data._id}`);
            }
        } catch { }
    };

    const deptOptions = (deptsData?.data || []).map((d) => ({ value: d._id, label: d.name }));
    const designationOptions = (designationsData?.data || []).map((d) => ({ value: d._id, label: d.name }));
    const shiftOptions = (shiftsData?.data || []).map((s) => ({ value: s._id, label: s.name }));
    const structureOptions = (structuresData?.data || []).map((s) => ({ value: s._id, label: s.name }));
    const leaveStructureOptions = (leavesData?.data || []).map((l) => ({ value: l._id, label: l.name }));

    return (
        <div>
            <PageHeader
                title={isEdit ? 'Edit Employee' : 'New Employee'}
                actions={<Button variant="outline" onClick={() => navigate('/employees')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>} />

            <Card>
                <div className="border-b flex gap-1 px-4">
                    {tabs.map((t) => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 ${tab === t.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="p-6 space-y-4">
                    {tab === 'basic' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="First Name" required value={form.firstName} onChange={(e) => update('firstName', e.target.value)} />
                                <Input label="Last Name" required value={form.lastName} onChange={(e) => update('lastName', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Select label="Gender" placeholder="Select..."
                                    options={[
                                        { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' },
                                        { value: 'other', label: 'Other' }, { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                                    ]}
                                    value={form.gender} onChange={(e) => update('gender', e.target.value)} />
                                <Input label="Date of Birth" type="date" value={form.dateOfBirth}
                                    onChange={(e) => update('dateOfBirth', e.target.value)} />
                                <Input label="NIC Number" value={form.nationalIdNumber}
                                    onChange={(e) => update('nationalIdNumber', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Select label="Marital Status" placeholder="Select..."
                                    options={[
                                        { value: 'single', label: 'Single' }, { value: 'married', label: 'Married' },
                                        { value: 'divorced', label: 'Divorced' }, { value: 'widowed', label: 'Widowed' },
                                        { value: 'separated', label: 'Separated' },
                                    ]}
                                    value={form.maritalStatus} onChange={(e) => update('maritalStatus', e.target.value)} />
                                <Input label="Nationality" value={form.nationality} onChange={(e) => update('nationality', e.target.value)} />
                                <Input label="Blood Group" value={form.bloodGroup} onChange={(e) => update('bloodGroup', e.target.value)} />
                            </div>
                        </>
                    )}

                    {tab === 'contact' && (
                        <>
                            <div className="grid grid-cols-3 gap-4">
                                <Input label="Email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
                                <Input label="Phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                                <Input label="Mobile" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold mb-2">Permanent Address</p>
                                <Input label="Line 1" value={form.permanentAddress.line1}
                                    onChange={(e) => update('permanentAddress.line1', e.target.value)} />
                                <div className="grid grid-cols-2 gap-4 mt-2">
                                    <Input label="City" value={form.permanentAddress.city}
                                        onChange={(e) => update('permanentAddress.city', e.target.value)} />
                                    <Input label="Postal Code" value={form.permanentAddress.postalCode}
                                        onChange={(e) => update('permanentAddress.postalCode', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold mb-2">Emergency Contact</p>
                                <div className="grid grid-cols-3 gap-4">
                                    <Input label="Name" value={form.emergencyContact.name}
                                        onChange={(e) => update('emergencyContact.name', e.target.value)} />
                                    <Input label="Relationship" value={form.emergencyContact.relationship}
                                        onChange={(e) => update('emergencyContact.relationship', e.target.value)} />
                                    <Input label="Phone" value={form.emergencyContact.phone}
                                        onChange={(e) => update('emergencyContact.phone', e.target.value)} />
                                </div>
                            </div>
                        </>
                    )}

                    {tab === 'employment' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="Department" placeholder="Select..." options={deptOptions}
                                    value={form.departmentId} onChange={(e) => update('departmentId', e.target.value)} />
                                <Select label="Designation" placeholder="Select..." options={designationOptions}
                                    value={form.designationId} onChange={(e) => update('designationId', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="Employment Type"
                                    options={[
                                        { value: 'permanent', label: 'Permanent' },
                                        { value: 'contract', label: 'Contract' },
                                        { value: 'probation', label: 'Probation' },
                                        { value: 'intern', label: 'Intern' },
                                        { value: 'part_time', label: 'Part-time' },
                                        { value: 'consultant', label: 'Consultant' },
                                    ]}
                                    value={form.employmentType} onChange={(e) => update('employmentType', e.target.value)} />
                                <Input label="Date of Joining" required type="date" value={form.dateOfJoining}
                                    onChange={(e) => update('dateOfJoining', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Input label="Probation End Date" type="date" value={form.probationEndDate}
                                    onChange={(e) => update('probationEndDate', e.target.value)} />
                                <Input label="Work Location" value={form.workLocation}
                                    onChange={(e) => update('workLocation', e.target.value)} />
                                <Select label="Work Shift" placeholder="Select..." options={shiftOptions}
                                    value={form.workShift} onChange={(e) => update('workShift', e.target.value)} />
                            </div>
                            <Select label="Status"
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'probation', label: 'Probation' },
                                    { value: 'on_leave', label: 'On Leave' },
                                    { value: 'suspended', label: 'Suspended' },
                                    { value: 'terminated', label: 'Terminated' },
                                    { value: 'resigned', label: 'Resigned' },
                                    { value: 'retired', label: 'Retired' },
                                ]}
                                value={form.status} onChange={(e) => update('status', e.target.value)} />
                        </>
                    )}

                    {tab === 'statutory' && (
                        <>
                            <div className="grid grid-cols-3 gap-4">
                                <Input label="EPF Number" value={form.epfNumber} onChange={(e) => update('epfNumber', e.target.value)} />
                                <Input label="ETF Number" value={form.etfNumber} onChange={(e) => update('etfNumber', e.target.value)} />
                                <Input label="Tax Registration (TIN)" value={form.taxRegistrationNumber}
                                    onChange={(e) => update('taxRegistrationNumber', e.target.value)} />
                            </div>
                            <p className="text-sm font-semibold mt-4 mb-2">Bank Details (for salary disbursement)</p>
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Bank Name" value={form.bankDetails.bankName}
                                    onChange={(e) => update('bankDetails.bankName', e.target.value)} />
                                <Input label="Branch Name" value={form.bankDetails.branchName}
                                    onChange={(e) => update('bankDetails.branchName', e.target.value)} />
                                <Input label="Account Number" value={form.bankDetails.accountNumber}
                                    onChange={(e) => update('bankDetails.accountNumber', e.target.value)} />
                                <Input label="Account Name" value={form.bankDetails.accountName}
                                    onChange={(e) => update('bankDetails.accountName', e.target.value)} />
                            </div>
                        </>
                    )}

                    {tab === 'compensation' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="Employee Category" required
                                    options={[
                                        { value: 'Permanent', label: 'Permanent' },
                                        { value: 'Trainee', label: 'Trainee' }
                                    ]}
                                    value={form.employeeCategory} onChange={(e) => update('employeeCategory', e.target.value)} />
                                <Input label="Basic Wage Rate (LKR/hour)" type="number" min="0"
                                    value={form.basicWageRate} onChange={(e) => update('basicWageRate', Number(e.target.value))} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Input label="EPF Rate (%)" type="number" min="0" max="100"
                                    value={form.epfRate} onChange={(e) => update('epfRate', Number(e.target.value))} />
                                <Input label="ETF Rate (%)" type="number" min="0" max="100"
                                    value={form.etfRate} onChange={(e) => update('etfRate', Number(e.target.value))} />
                                <Input label="Automated OT Cutoff (Hours/month)" type="number" min="0"
                                    value={form.otCutoffHours} onChange={(e) => update('otCutoffHours', Number(e.target.value))} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select label="Salary Structure" placeholder="None (use basic only)" options={structureOptions}
                                    value={form.salaryStructureId} onChange={(e) => update('salaryStructureId', e.target.value)} />
                                <Select label="Leave Structure" placeholder="None (use default standard balances)" options={leaveStructureOptions}
                                    value={form.leaveStructureId} onChange={(e) => update('leaveStructureId', e.target.value)} />
                            </div>
                            <Input label="Basic Salary (LKR/month)" type="number" step="0.01" min="0"
                                value={form.basicSalary} onChange={(e) => update('basicSalary', e.target.value)} />
                            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900 mt-2">
                                <strong>Payroll tip:</strong> Allowances from the salary structure will be added on top of basic when payroll runs. EPF (employee rate + employer 12%) and ETF (employer rate) auto-calculate. Hourly wage rates and OT hour cutoffs apply based on shift details.
                            </div>
                            <Textarea label="Notes" rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => navigate('/employees')}>Cancel</Button>
                    <Button variant="primary" onClick={submit}
                        loading={createMutation.isPending || updateMutation.isPending}>
                        <Save size={16} className="mr-1.5" /> {isEdit ? 'Update' : 'Create Employee'}
                    </Button>
                </div>
            </Card>
        </div>
    );
}