import { useState } from 'react';
import { Plus, Edit, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '../features/hr/useHr';

export default function HolidaysPage() {
    const [year, setYear] = useState(new Date().getFullYear());
    const { data } = useHolidays({ year });
    const createM = useCreateHoliday(); const updateM = useUpdateHoliday(); const deleteM = useDeleteHoliday();

    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ name: '', date: '', type: 'public' });

    const holidays = data?.data || [];
    const showAll = year === 'all';

    const openNew = () => { setEditing(null); setForm({ name: '', date: '', type: 'public' }); setIsOpen(true); };
    const openEdit = (h) => {
        setEditing(h);
        setForm({ name: h.name, date: h.date.slice(0, 10), type: h.type });
        setIsOpen(true);
    };

    const submit = async () => {
        if (!form.name || !form.date) { toast.error('Name and date required'); return; }
        try {
            if (editing) await updateM.mutateAsync({ id: editing._id, data: form });
            else await createM.mutateAsync(form);
            // Update year filter to match the holiday date
            const holidayYear = new Date(form.date).getFullYear();
            setYear(holidayYear);
            setIsOpen(false);
        } catch { }
    };

    const columns = [
        { key: 'date', label: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-LK', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) },
        { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
        { key: 'type', label: 'Type', render: (r) => <Badge>{r.type}</Badge> },
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
            <PageHeader title="Holiday Calendar" description="Public and company holidays"
                actions={<Button variant="primary" onClick={openNew}><Plus size={16} className="mr-1.5" />Add Holiday</Button>} />

            <Card>
                <div className="p-4 border-b">
                    <div className="w-40">
                        <Select
                            label="Filter by Year"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Years' },
                                { value: String(new Date().getFullYear()), label: String(new Date().getFullYear()) },
                                { value: String(new Date().getFullYear() + 1), label: String(new Date().getFullYear() + 1) },
                                { value: String(new Date().getFullYear() - 1), label: String(new Date().getFullYear() - 1) },
                            ]}
                        />
                    </div>
                </div>
                {holidays.length === 0
                    ? <p className="text-center py-16 text-gray-500">{showAll ? 'No holidays found' : `No holidays in ${year}`}</p>
                    : <Table columns={columns} data={holidays} />}
            </Card>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? 'Edit Holiday' : 'New Holiday'} size="md">
                <div className="p-6 space-y-4">
                    <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Date" required type="date" value={form.date}
                            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                        <Select label="Type"
                            options={[
                                { value: 'public', label: 'Public' },
                                { value: 'national', label: 'National' },
                                { value: 'religious', label: 'Religious' },
                                { value: 'poya', label: 'Poya' },
                                { value: 'company', label: 'Company' },
                            ]}
                            value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
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
                title="Delete Holiday" message={`Delete "${deleting?.name}"?`} variant="danger" />
        </div>
    );
}