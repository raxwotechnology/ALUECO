import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Users, Mail, Phone } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { useEmployees, useDepartments } from '../features/hr/useHr';

const statusVariant = {
    active: 'success', on_leave: 'warning', probation: 'info',
    suspended: 'danger', terminated: 'default', resigned: 'default', retired: 'default',
};

export default function EmployeesPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ search: '', departmentId: '', status: 'active', page: 1, limit: 20 });

    const { data, isLoading } = useEmployees(filters);
    const { data: deptsData } = useDepartments();

    const employees = data?.data || [];
    const depts = deptsData?.data || [];
    const deptOptions = depts.map((d) => ({ value: d._id, label: d.name }));

    const columns = [
        { key: 'employeeCode', label: 'ID', width: '100px', render: (r) => <span className="font-mono text-xs">{r.employeeCode}</span> },
        {
            key: 'name', label: 'Name',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.firstName} {r.lastName}</p>
                    <p className="text-xs text-gray-500">
                        {r.email && <span className="inline-flex items-center gap-1 mr-2"><Mail size={10} />{r.email}</span>}
                        {r.phone && <span className="inline-flex items-center gap-1"><Phone size={10} />{r.phone}</span>}
                    </p>
                </div>
            ),
        },
        { key: 'department', label: 'Department', render: (r) => r.departmentId?.name || '—' },
        { key: 'designation', label: 'Designation', render: (r) => r.designationId?.name || '—' },
        { key: 'employmentType', label: 'Type', render: (r) => <Badge>{r.employmentType?.replace(/_/g, ' ')}</Badge> },
        { key: 'dateOfJoining', label: 'Joined', render: (r) => r.dateOfJoining ? new Date(r.dateOfJoining).toLocaleDateString('en-LK') : '—' },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status?.replace(/_/g, ' ')}</Badge> },
        {
            key: 'actions', label: '', width: '50px', render: (r) => (
                <button onClick={() => navigate(`/employees/${r._id}`)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={16} /></button>
            )
        },
    ];

    return (
        <div>
            <PageHeader title="Employees" description="All team members and their employment details"
                actions={<Button variant="primary" onClick={() => navigate('/employees/new')}>
                    <Plus size={16} className="mr-1.5" /> Add Employee
                </Button>} />

            <Card>
                <div className="p-3 sm:p-4 border-b flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <div className="relative flex-1 min-w-0">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search by name, code, email..."
                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-48">
                        <Select placeholder="All Departments" options={deptOptions}
                            value={filters.departmentId}
                            onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-40">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'on_leave', label: 'On Leave' },
                                { value: 'probation', label: 'Probation' },
                                { value: 'suspended', label: 'Suspended' },
                                { value: 'terminated', label: 'Terminated' },
                                { value: 'resigned', label: 'Resigned' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                    </div>
                </div>

                {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : employees.length === 0 ? <EmptyState icon={Users} title="No employees" description="Add your first employee"
                        action={<Button variant="primary" onClick={() => navigate('/employees/new')}>Add Employee</Button>} />
                        : <>
                            <Table columns={columns} data={employees} onRowClick={(r) => navigate(`/employees/${r._id}`)} />
                            <Pagination page={filters.page} totalPages={data.totalPages} total={data.total}
                                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                        </>}
            </Card>
        </div>
    );
}