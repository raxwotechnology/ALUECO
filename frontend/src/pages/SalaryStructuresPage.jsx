import { useState } from 'react';
import { Plus, Edit, Trash2, Calculator } from 'lucide-react';
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
    useSalaryStructures, useCreateSalaryStructure, useUpdateSalaryStructure, useDeleteSalaryStructure,
} from '../features/hr/useHr';

export default function SalaryStructuresPage() {
    const { data } = useSalaryStructures();
    const createM = useCreateSalaryStructure(); const updateM = useUpdateSalaryStructure(); const deleteM = useDeleteSalaryStructure();

    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({ name: '', code: '', description: '', frequency: 'monthly', components: [] });

    const list = data?.data || [];

    const openNew = () => {
        setEditing(null);
        setForm({ name: '', code: '', description: '', frequency: 'monthly', components: [] });
        setIsOpen(true);
    };

    const openEdit = (s) => {
        setEditing(s);
        setForm({ name: s.name, code: s.code || '', description: s.description || '', frequency: s.frequency || 'monthly', components: s.components || [] });
        setIsOpen(true);
    };

    const addComponent = () => {
        setForm((f) => ({
            ...f,
            components: [...f.components, {
                name: '', type: 'earning', calculationType: 'fixed',
                amount: 0, percentage: 0, isTaxable: true, isStatutory: false,
            }],
        }));
    };

    const updateComponent = (idx, field, value) => {
        setForm((f) => {
            const newC = [...f.components];
            newC[idx] = { ...newC[idx], [field]: value };
            return { ...f, components: newC };
        });
    };

    const removeComponent = (idx) => {
        setForm((f) => ({ ...f, components: f.components.filter((_, i) => i !== idx) }));
    };

    const submit = async () => {
        if (!form.name) { toast.error('Name required'); return; }
        try {
            const payload = {
                ...form,
                components: form.components.map((c) => ({
                    ...c, amount: +c.amount || 0, percentage: +c.percentage || 0,
                })),
            };
            if (editing) await updateM.mutateAsync({ id: editing._id, data: payload });
            else await createM.mutateAsync(payload);
            setIsOpen(false);
        } catch { }
    };

    const columns = [
        { key: 'name', label: 'Name', render: (r) => <span className="font-medium">{r.name}</span> },
        { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
        { key: 'frequency', label: 'Frequency', render: (r) => <span className="capitalize text-sm font-semibold text-gray-700">{r.frequency || 'Monthly'}</span> },
        { key: 'components', label: 'Components', render: (r) => r.components?.length || 0 },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
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
            <PageHeader title="Salary Structures" description="Define earnings and deductions templates"
                actions={<Button variant="primary" onClick={openNew}><Plus size={16} className="mr-1.5" />Add Structure</Button>} />

            <Card>
                {list.length === 0
                    ? <EmptyState icon={Calculator} title="No structures defined"
                        description="Create salary structures to standardize earnings/deductions across employees" />
                    : <Table columns={columns} data={list} />}
            </Card>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}
                title={editing ? 'Edit Salary Structure' : 'New Salary Structure'} size="xl">
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Name" required value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                        <Input label="Code" value={form.code}
                            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
                        <Select label="Frequency"
                            options={[
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'daily', label: 'Daily' }
                            ]}
                            value={form.frequency}
                            onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-semibold">Components</h4>
                            <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                                <Plus size={14} className="mr-1" />Add Component
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                            Earnings are added to gross pay. Deductions are subtracted. EPF, ETF and APIT are calculated automatically — you don't need to add them here.
                        </p>
                        <div className="space-y-2">
                            {form.components.map((c, idx) => (
                                <div key={idx} className="border rounded p-2">
                                    <div className="grid grid-cols-5 gap-2 items-end">
                                        <Input label="Name" value={c.name}
                                            onChange={(e) => updateComponent(idx, 'name', e.target.value)} />
                                        <Select label="Type"
                                            options={[{ value: 'earning', label: 'Earning' }, { value: 'deduction', label: 'Deduction' }]}
                                            value={c.type} onChange={(e) => updateComponent(idx, 'type', e.target.value)} />
                                        <Select label="Calc Type"
                                            options={[
                                                { value: 'fixed', label: 'Fixed Amount' },
                                                { value: 'percentage_of_basic', label: '% of Basic' },
                                            ]}
                                            value={c.calculationType} onChange={(e) => updateComponent(idx, 'calculationType', e.target.value)} />
                                        {c.calculationType === 'fixed'
                                            ? <Input label="Amount" type="number" step="0.01" min="0" value={c.amount}
                                                onChange={(e) => updateComponent(idx, 'amount', e.target.value)} />
                                            : <Input label="Percentage" type="number" step="0.01" min="0" max="100" value={c.percentage}
                                                onChange={(e) => updateComponent(idx, 'percentage', e.target.value)} />}
                                        <button onClick={() => removeComponent(idx)}
                                            className="p-2 hover:bg-red-50 text-red-600 rounded"><Trash2 size={14} /></button>
                                    </div>
                                    <div className="mt-2 flex gap-4">
                                        <label className="flex items-center gap-1 text-xs">
                                            <input type="checkbox" checked={c.isTaxable}
                                                onChange={(e) => updateComponent(idx, 'isTaxable', e.target.checked)} />
                                            Taxable
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
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
                title="Delete Structure" message={`Delete "${deleting?.name}"?`} variant="danger" />
        </div>
    );
}