import { useState } from 'react';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
    useLeaveStructures, useCreateLeaveStructure, useUpdateLeaveStructure, useDeleteLeaveStructure,
} from '../features/hr/useHr';

export default function LeaveStructuresPage() {
    const { data } = useLeaveStructures();
    const createM = useCreateLeaveStructure();
    const updateM = useUpdateLeaveStructure();
    const deleteM = useDeleteLeaveStructure();

    const [isOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const [form, setForm] = useState({
        name: '', code: '', description: '',
        leaveBalances: { annual: 14, casual: 7, sick: 7, maternity: 84, paternity: 3, unpaid: 0 }
    });

    const list = data?.data || [];

    const openNew = () => {
        setEditing(null);
        setForm({
            name: '', code: '', description: '',
            leaveBalances: { annual: 14, casual: 7, sick: 7, maternity: 84, paternity: 3, unpaid: 0 }
        });
        setIsFormOpen(true);
    };

    const openEdit = (s) => {
        setEditing(s);
        setForm({
            name: s.name,
            code: s.code || '',
            description: s.description || '',
            leaveBalances: {
                annual: s.leaveBalances?.annual ?? 14,
                casual: s.leaveBalances?.casual ?? 7,
                sick: s.leaveBalances?.sick ?? 7,
                maternity: s.leaveBalances?.maternity ?? 84,
                paternity: s.leaveBalances?.paternity ?? 3,
                unpaid: s.leaveBalances?.unpaid ?? 0,
            }
        });
        setIsFormOpen(true);
    };

    const submit = async () => {
        if (!form.name || !form.code) {
            toast.error('Name and Code are required');
            return;
        }
        try {
            const payload = {
                ...form,
                leaveBalances: {
                    annual: +form.leaveBalances.annual || 0,
                    casual: +form.leaveBalances.casual || 0,
                    sick: +form.leaveBalances.sick || 0,
                    maternity: +form.leaveBalances.maternity || 0,
                    paternity: +form.leaveBalances.paternity || 0,
                    unpaid: +form.leaveBalances.unpaid || 0,
                }
            };
            if (editing) {
                await updateM.mutateAsync({ id: editing._id, data: payload });
            } else {
                await createM.mutateAsync(payload);
            }
            setIsFormOpen(false);
        } catch { }
    };

    const confirmDelete = async () => {
        if (!deleting) return;
        try {
            await deleteM.mutateAsync(deleting._id);
            setDeleting(null);
        } catch { }
    };

    const columns = [
        { key: 'name', label: 'Name', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
        { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs text-gray-500">{r.code}</span> },
        {
            key: 'balances', label: 'Leave Balances', render: (r) => (
                <div className="flex flex-wrap gap-1 text-[11px]">
                    <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">Annual: {r.leaveBalances?.annual || 0}</span>
                    <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded">Casual: {r.leaveBalances?.casual || 0}</span>
                    <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">Sick: {r.leaveBalances?.sick || 0}</span>
                    <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">Maternity: {r.leaveBalances?.maternity || 0}</span>
                    <span className="bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded">Paternity: {r.leaveBalances?.paternity || 0}</span>
                    <span className="bg-gray-50 text-gray-700 px-1.5 py-0.5 rounded">Unpaid: {r.leaveBalances?.unpaid || 0}</span>
                </div>
            )
        },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
        {
            key: 'actions', label: '', width: '100px', render: (r) => (
                <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-gray-100 rounded" title="Edit"><Edit size={16} /></button>
                    <button onClick={() => setDeleting(r)} className="p-1.5 hover:bg-red-50 text-red-600 rounded" title="Delete"><Trash2 size={16} /></button>
                </div>
            )
        },
    ];

    return (
        <div>
            <PageHeader title="Leave Structures" description="Define annual leave allowance templates for employees"
                actions={<Button variant="primary" onClick={openNew}><Plus size={16} className="mr-1.5" />Add Leave Structure</Button>} />

            <Card>
                {list.length === 0
                    ? <EmptyState icon={Calendar} title="No Leave Structures" description="Create a leave structure to assign default leave balances to employees." />
                    : <Table columns={columns} data={list} />}
            </Card>

            <Modal isOpen={isOpen} onClose={() => setIsFormOpen(false)} title={editing ? `Edit Leave Structure — ${editing.name}` : 'New Leave Structure'} size="md">
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Structure Name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Standard Staff Leaves" />
                        <Input label="Structure Code" required value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. STD_LEAVES" disabled={!!editing} />
                    </div>
                    <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional details..." />

                    <h4 className="text-sm font-semibold border-b pb-2 text-gray-800">Leave Allowances (Days per Year)</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Annual" type="number" min="0" value={form.leaveBalances.annual} onChange={(e) => setForm(f => ({ ...f, leaveBalances: { ...f.leaveBalances, annual: +e.target.value } }))} />
                        <Input label="Casual" type="number" min="0" value={form.leaveBalances.casual} onChange={(e) => setForm(f => ({ ...f, leaveBalances: { ...f.leaveBalances, casual: +e.target.value } }))} />
                        <Input label="Sick" type="number" min="0" value={form.leaveBalances.sick} onChange={(e) => setForm(f => ({ ...f, leaveBalances: { ...f.leaveBalances, sick: +e.target.value } }))} />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Maternity" type="number" min="0" value={form.leaveBalances.maternity} onChange={(e) => setForm(f => ({ ...f, leaveBalances: { ...f.leaveBalances, maternity: +e.target.value } }))} />
                        <Input label="Paternity" type="number" min="0" value={form.leaveBalances.paternity} onChange={(e) => setForm(f => ({ ...f, leaveBalances: { ...f.leaveBalances, paternity: +e.target.value } }))} />
                        <Input label="Unpaid" type="number" min="0" value={form.leaveBalances.unpaid} onChange={(e) => setForm(f => ({ ...f, leaveBalances: { ...f.leaveBalances, unpaid: +e.target.value } }))} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submit} loading={createM.isPending || updateM.isPending}>Save</Button>
                </div>
            </Modal>

            <ConfirmDialog isOpen={!!deleting} title="Delete Leave Structure?" message={`Are you sure you want to delete "${deleting?.name}"? Employees using this structure won't be affected, but you cannot assign it to new employees.`} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} confirmText="Delete" />
        </div>
    );
}
