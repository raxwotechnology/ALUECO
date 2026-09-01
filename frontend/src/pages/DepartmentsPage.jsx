import { useState } from 'react';
import { Plus, Edit, Trash2, Building2 } from 'lucide-react';
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
import Select from '../components/ui/Select';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
    useDepartments, useCreateDepartment, useUpdateDepartment, useDeleteDepartment,
} from '../features/hr/useHr';

export default function DepartmentsPage() {
    const { data, isLoading } = useDepartments();
    const createMutation = useCreateDepartment();
    const updateMutation = useUpdateDepartment();
    const deleteMutation = useDeleteDepartment();

    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ code: '', name: '', description: '', parentDepartmentId: '' });

    const departments = data?.data || [];
    const parentOptions = departments.map((d) => ({ value: d._id, label: d.name }));

    const openNew = () => {
        setEditing(null);
        setForm({ code: '', name: '', description: '', parentDepartmentId: '' });
        setIsOpen(true);
    };

    const openEdit = (d) => {
        setEditing(d);
        setForm({
            code: d.code, name: d.name, description: d.description || '',
            parentDepartmentId: d.parentDepartmentId?._id || '',
        });
        setIsOpen(true);
    };

    const submit = async () => {
        if (!form.code || !form.name) { toast.error('Code and name required'); return; }
        try {
            const payload = { ...form, parentDepartmentId: form.parentDepartmentId || undefined };
            if (editing) await updateMutation.mutateAsync({ id: editing._id, data: payload });
            else await createMutation.mutateAsync(payload);
            setIsOpen(false);
        } catch { }
    };

    const columns = [
        { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
        { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
        { key: 'parent', label: 'Parent', render: (r) => r.parentDepartmentId?.name || '—' },
        { key: 'manager', label: 'Manager', render: (r) => r.managerId ? `${r.managerId.firstName} ${r.managerId.lastName}` : '—' },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
        {
            key: 'actions', label: 'Actions', width: '100px', render: (r) => (
                <div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-gray-100 rounded"><Edit size={16} /></button>
                    <button onClick={() => setDeleting(r)} className="p-1.5 hover:bg-red-50 text-red-600 rounded"><Trash2 size={16} /></button>
                </div>
            )
        },
    ];

    return (
        <div>
            <PageHeader title="Departments" description="Organizational units"
                actions={<Button variant="primary" onClick={openNew}><Plus size={16} className="mr-1.5" />Add Department</Button>} />

            <Card>
                {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : departments.length === 0 ? <EmptyState icon={Building2} title="No departments" description="Add your first department"
                        action={<Button variant="primary" onClick={openNew}>Add Department</Button>} />
                        : <Table columns={columns} data={departments} />}
            </Card>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}
                title={editing ? 'Edit Department' : 'New Department'} size="md">
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Code" required value={form.code}
                            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
                        <Input label="Name" required value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <Select label="Parent Department (optional)" placeholder="None"
                        options={parentOptions.filter((o) => !editing || o.value !== editing._id)}
                        value={form.parentDepartmentId}
                        onChange={(e) => setForm((f) => ({ ...f, parentDepartmentId: e.target.value }))} />
                    <Textarea label="Description" rows={2} value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submit}
                        loading={createMutation.isPending || updateMutation.isPending}>
                        {editing ? 'Update' : 'Create'}
                    </Button>
                </div>
            </Modal>

            <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)}
                onConfirm={async () => { await deleteMutation.mutateAsync(deleting._id); setDeleting(null); }}
                title="Delete Department" message={`Delete "${deleting?.name}"?`} variant="danger"
                loading={deleteMutation.isPending} />
        </div>
    );
}