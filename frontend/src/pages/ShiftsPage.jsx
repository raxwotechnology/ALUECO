import { useState } from 'react';
import { Plus, Edit, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useShifts, useCreateShift, useUpdateShift, useDeleteShift } from '../features/hr/useHr';

export default function ShiftsPage() {
    const { data, isLoading } = useShifts();
    const createM = useCreateShift(); const updateM = useUpdateShift(); const deleteM = useDeleteShift();

    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ name: '', code: '', startTime: '08:00', endTime: '17:00', breakMinutes: 60, graceMinutes: 15 });

    const shifts = data?.data || [];

    const openNew = () => { setEditing(null); setForm({ name: '', code: '', startTime: '08:00', endTime: '17:00', breakMinutes: 60, graceMinutes: 15 }); setIsOpen(true); };
    const openEdit = (s) => {
        setEditing(s);
        setForm({ name: s.name, code: s.code || '', startTime: s.startTime, endTime: s.endTime, breakMinutes: s.breakMinutes, graceMinutes: s.graceMinutes });
        setIsOpen(true);
    };

    const submit = async () => {
        if (!form.name || !form.startTime || !form.endTime) { toast.error('Name and times required'); return; }
        const payload = { ...form, breakMinutes: +form.breakMinutes, graceMinutes: +form.graceMinutes };
        try {
            if (editing) await updateM.mutateAsync({ id: editing._id, data: payload });
            else await createM.mutateAsync(payload);
            setIsOpen(false);
        } catch { }
    };

    const columns = [
        { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
        { key: 'code', label: 'Code' },
        { key: 'timing', label: 'Timing', render: (r) => `${r.startTime} - ${r.endTime}` },
        { key: 'break', label: 'Break', render: (r) => `${r.breakMinutes} min` },
        { key: 'working', label: 'Working', render: (r) => `${(r.workingMinutes / 60).toFixed(1)} hrs` },
        { key: 'grace', label: 'Grace', render: (r) => `${r.graceMinutes} min` },
        {
            key: 'actions', label: '', width: '100px', render: (r) => (
                <div className="flex gap-1">
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-gray-100 rounded"><Edit size={16} /></button>
                    <button onClick={() => setDeleting(r)} className="p-1.5 hover:bg-red-50 text-red-600 rounded"><Trash2 size={16} /></button>
                </div>
            )
        },
    ];

    return (
        <div>
            <PageHeader title="Shifts" description="Work shift patterns"
                actions={<Button variant="primary" onClick={openNew}><Plus size={16} className="mr-1.5" />Add Shift</Button>} />
            <Card>
                {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : shifts.length === 0 ? <EmptyState icon={Clock} title="No shifts" description="Define work shift patterns" />
                        : <Table columns={columns} data={shifts} />}
            </Card>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? 'Edit Shift' : 'New Shift'} size="md">
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                        <Input label="Code" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Start Time" required type="time" value={form.startTime}
                            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                        <Input label="End Time" required type="time" value={form.endTime}
                            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Break (minutes)" type="number" min="0" value={form.breakMinutes}
                            onChange={(e) => setForm((f) => ({ ...f, breakMinutes: e.target.value }))} />
                        <Input label="Grace (minutes late allowance)" type="number" min="0" value={form.graceMinutes}
                            onChange={(e) => setForm((f) => ({ ...f, graceMinutes: e.target.value }))} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submit} loading={createM.isPending || updateM.isPending}>
                        {editing ? 'Update' : 'Create'}
                    </Button>
                </div>
            </Modal>

            <ConfirmDialog isOpen={!!deleting} onClose={() => setDeleting(null)}
                onConfirm={async () => { await deleteM.mutateAsync(deleting._id); setDeleting(null); }}
                title="Delete Shift" message={`Delete shift "${deleting?.name}"?`} variant="danger"
                loading={deleteM.isPending} />
        </div>
    );
}