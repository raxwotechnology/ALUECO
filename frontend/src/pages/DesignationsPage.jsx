import { useState } from 'react';
import { Plus, Edit, Trash2, Award } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
    useDesignations, useCreateDesignation, useUpdateDesignation, useDeleteDesignation,
    useDepartments,
} from '../features/hr/useHr';

export default function DesignationsPage() {
    const { data, isLoading } = useDesignations();
    const { data: deptsData } = useDepartments();
    const createMutation = useCreateDesignation();
    const updateMutation = useUpdateDesignation();
    const deleteMutation = useDeleteDesignation();

    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ code: '', name: '', departmentId: '', level: 1 });

    const list = data?.data || [];
    const depts = deptsData?.data || [];
    const deptOptions = depts.map((d) => ({ value: d._id, label: d.name }));

    const openNew = () => { setEditing(null); setForm({ code: '', name: '', departmentId: '', level: 1 }); setIsOpen(true); };
    const openEdit = (d) => {
        setEditing(d);
        setForm({ code: d.code, name: d.name, departmentId: d.departmentId?._id || '', level: d.level || 1 });
        setIsOpen(true);
    };

    const submit = async () => {
        if (!form.code || !form.name) { toast.error('Code and name required'); return; }
        try {
            const payload = { ...form, level: +form.level, departmentId: form.departmentId || undefined };
            if (editing) await updateMutation.mutateAsync({ id: editing._id, data: payload });
            else await createMutation.mutateAsync(payload);
            setIsOpen(false);
        } catch { }
    };

    const columns = [
        { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
        { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
        { key: 'department', label: 'Department', render: (r) => r.departmentId?.name || '—' },
        { key: 'level', label: 'Level', render: (r) => <Badge>Level {r.level}</Badge> },
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
            <PageHeader title="Designations" description="Job titles and position levels"
                actions={<Button variant="primary" onClick={openNew}><Plus size={16} className="mr-1.5" />Add Designation</Button>} />

            <Card>
                {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : list.length === 0 ? <EmptyState icon={Award} title="No designations" description="Add designations to organize job roles" />
                        : <Table columns={columns} data={list} />}
            </Card>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}
                title={editing ? 'Edit Designation' : 'New Designation'} size="md">
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Code" required value={form.code}
                            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
                        <Input label="Name" required value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Department" placeholder="None" options={deptOptions}
                            value={form.departmentId}
                            onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))} />
                        <Input label="Level" type="number" min="1" max="10" value={form.level}
                            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} />
                    </div>
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
                title="Delete Designation" message={`Delete "${deleting?.name}"?`} variant="danger"
                loading={deleteMutation.isPending} />
        </div>
    );
}