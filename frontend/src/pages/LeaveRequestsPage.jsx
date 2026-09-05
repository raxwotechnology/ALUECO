import { useState } from 'react';
import { Plus, CheckCircle, XCircle, Ban, Plane } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { useLeaves, useCreateLeave, useLeaveActions, useEmployees } from '../features/hr/useHr';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'default',
};

export default function LeaveRequestsPage() {
    const { user } = useAuthStore();
    const canApprove = ['admin', 'manager'].includes(user?.role);

    const [filters, setFilters] = useState({ status: '', page: 1, limit: 20 });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [actionModal, setActionModal] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const [form, setForm] = useState({
        employeeId: '', leaveType: 'annual', fromDate: '', toDate: '',
        isHalfDay: false, reason: '',
    });

    const { data } = useLeaves(filters);
    const { data: empData } = useEmployees({ status: 'active', limit: 500 });
    const createM = useCreateLeave();
    const actions = useLeaveActions();

    const leaves = data?.data || [];
    const empOptions = (empData?.data || []).map((e) => ({ value: e._id, label: `${e.firstName} ${e.lastName} (${e.employeeCode})` }));

    const computeDays = () => {
        if (!form.fromDate || !form.toDate) return 0;
        if (form.isHalfDay) return 0.5;
        const from = new Date(form.fromDate); const to = new Date(form.toDate);
        return Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
    };

    const submitLeave = async () => {
        if (!form.employeeId || !form.fromDate || !form.toDate || !form.reason) {
            toast.error('All fields required'); return;
        }
        try {
            await createM.mutateAsync(form);
            setIsFormOpen(false);
            setForm({ employeeId: '', leaveType: 'annual', fromDate: '', toDate: '', isHalfDay: false, reason: '' });
        } catch { }
    };

    const handleAction = async () => {
        const { type, leave } = actionModal;
        try {
            if (type === 'approve') await actions.approve.mutateAsync(leave._id);
            else if (type === 'reject') await actions.reject.mutateAsync({ id: leave._id, reason: rejectReason });
            else if (type === 'cancel') await actions.cancel.mutateAsync(leave._id);
            setActionModal(null); setRejectReason('');
        } catch { }
    };

    const columns = [
        { key: 'leaveNumber', label: 'Ref', render: (r) => <span className="font-mono text-xs">{r.leaveNumber}</span> },
        {
            key: 'employee', label: 'Employee', render: (r) => (
                <div>
                    <p className="font-medium text-sm">{r.employeeName}</p>
                    <p className="text-xs text-gray-500 font-mono">{r.employeeCode}</p>
                </div>
            )
        },
        { key: 'type', label: 'Type', render: (r) => <Badge>{r.leaveType}</Badge> },
        {
            key: 'dates', label: 'Dates', render: (r) => (
                <div>
                    <p className="text-sm">{new Date(r.fromDate).toLocaleDateString('en-LK')} — {new Date(r.toDate).toLocaleDateString('en-LK')}</p>
                    <p className="text-xs text-gray-500">{r.numberOfDays} day{r.numberOfDays > 1 ? 's' : ''}{r.isHalfDay ? ' (half)' : ''}</p>
                </div>
            )
        },
        { key: 'reason', label: 'Reason', render: (r) => <span className="text-sm truncate max-w-xs block">{r.reason}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
        {
            key: 'actions', label: 'Actions', width: '120px', render: (r) => (
                <div className="flex gap-1">
                    {r.status === 'pending' && canApprove && (
                        <>
                            <button onClick={() => setActionModal({ type: 'approve', leave: r })}
                                className="p-1.5 hover:bg-green-50 text-green-600 rounded" title="Approve"><CheckCircle size={16} /></button>
                            <button onClick={() => setActionModal({ type: 'reject', leave: r })}
                                className="p-1.5 hover:bg-red-50 text-red-600 rounded" title="Reject"><XCircle size={16} /></button>
                        </>
                    )}
                    {['pending', 'approved'].includes(r.status) && (
                        <button onClick={() => setActionModal({ type: 'cancel', leave: r })}
                            className="p-1.5 hover:bg-gray-100 rounded" title="Cancel"><Ban size={16} /></button>
                    )}
                </div>
            )
        },
    ];

    return (
        <div>
            <PageHeader title="Leave Requests" description="Manage employee leave applications"
                actions={<Button variant="primary" onClick={() => setIsFormOpen(true)}>
                    <Plus size={16} className="mr-1.5" /> Request Leave
                </Button>} />

            <Card>
                <div className="p-4 border-b flex gap-3">
                    <div className="w-48">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'pending', label: 'Pending' },
                                { value: 'approved', label: 'Approved' },
                                { value: 'rejected', label: 'Rejected' },
                                { value: 'cancelled', label: 'Cancelled' },
                            ]}
                            value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                    </div>
                </div>
                {leaves.length === 0
                    ? <EmptyState icon={Plane} title="No leave requests" description="Submit a leave request" />
                    : <>
                        <Table columns={columns} data={leaves} />
                        <Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                    </>}
            </Card>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="New Leave Request" size="md">
                <div className="p-6 space-y-4">
                    <Select label="Employee" required placeholder="Select..."
                        options={empOptions} value={form.employeeId}
                        onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Leave Type"
                            options={[
                                { value: 'annual', label: 'Annual' },
                                { value: 'sick', label: 'Sick' },
                                { value: 'casual', label: 'Casual' },
                                { value: 'maternity', label: 'Maternity' },
                                { value: 'paternity', label: 'Paternity' },
                                { value: 'unpaid', label: 'Unpaid' },
                                { value: 'bereavement', label: 'Bereavement' },
                            ]}
                            value={form.leaveType} onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))} />
                        <div className="flex items-end pb-2">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.isHalfDay}
                                    onChange={(e) => setForm((f) => ({ ...f, isHalfDay: e.target.checked }))} />
                                Half day
                            </label>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="From Date" required type="date" value={form.fromDate}
                            onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))} />
                        <Input label="To Date" required type="date" value={form.toDate}
                            onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))} />
                    </div>
                    <p className="text-sm">Total days: <strong>{computeDays()}</strong></p>
                    <Textarea label="Reason" required rows={3} value={form.reason}
                        onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submitLeave} loading={createM.isPending}>Submit</Button>
                </div>
            </Modal>

            <Modal isOpen={!!actionModal} onClose={() => { setActionModal(null); setRejectReason(''); }}
                title={actionModal?.type === 'approve' ? 'Approve Leave' : actionModal?.type === 'reject' ? 'Reject Leave' : 'Cancel Leave'} size="md">
                <div className="p-6 space-y-4">
                    {actionModal?.type === 'reject' ? (
                        <Textarea label="Rejection Reason" required rows={3} value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)} />
                    ) : (
                        <p>{actionModal?.type === 'approve'
                            ? `Approve ${actionModal?.leave?.numberOfDays} day(s) of ${actionModal?.leave?.leaveType} leave for ${actionModal?.leave?.employeeName}?`
                            : `Cancel this leave request?`}</p>
                    )}
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => { setActionModal(null); setRejectReason(''); }}>Close</Button>
                    <Button variant={actionModal?.type === 'reject' ? 'danger' : 'primary'} onClick={handleAction}
                        loading={actions.approve.isPending || actions.reject.isPending || actions.cancel.isPending}>
                        Confirm
                    </Button>
                </div>
            </Modal>
        </div>
    );
}