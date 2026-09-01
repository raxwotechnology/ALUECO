import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Cpu } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
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

export default function MachinesPage() {
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [form, setForm] = useState({
        name: '',
        code: '',
        type: '',
        status: 'active',
        capacity: 0,
        fuelType: 'electric',
        hourlyCost: 0
    });

    const fetchMachines = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/production/machines');
            setMachines(data.data || []);
        } catch (error) {
            toast.error('Failed to load machines');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMachines();
    }, []);

    const openNew = () => {
        setEditing(null);
        setForm({
            name: '',
            code: '',
            type: '',
            status: 'active',
            capacity: '',
            fuelType: 'electric',
            hourlyCost: ''
        });
        setIsOpen(true);
    };

    const openEdit = (m) => {
        setEditing(m);
        setForm({
            name: m.name || '',
            code: m.code || '',
            type: m.type || '',
            status: m.status || 'active',
            capacity: m.capacity || '',
            fuelType: m.fuelType || 'electric',
            hourlyCost: m.hourlyCost || ''
        });
        setIsOpen(true);
    };

    const submit = async () => {
        if (!form.name) { toast.error('Name required'); return; }
        if (!form.code) { toast.error('Code required'); return; }
        
        try {
            const payload = {
                ...form,
                capacity: +form.capacity || 0,
                hourlyCost: +form.hourlyCost || 0
            };
            
            if (editing) {
                await api.put(`/production/machines/${editing._id}`, payload);
                toast.success('Machine updated successfully');
            } else {
                await api.post('/production/machines', payload);
                toast.success('Machine added successfully');
            }
            setIsOpen(false);
            fetchMachines();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save machine');
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/production/machines/${deleting._id}`);
            toast.success('Machine deleted successfully');
            setDeleting(null);
            fetchMachines();
        } catch (error) {
            toast.error('Failed to delete machine');
        }
    };

    const columns = [
        { key: 'name', label: 'Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
        { key: 'code', label: 'Code', render: (r) => <span className="font-mono text-xs text-gray-700 bg-gray-150 px-1.5 py-0.5 rounded">{r.code}</span> },
        { key: 'type', label: 'Type', render: (r) => <span className="text-gray-600 capitalize text-sm">{r.type || 'Other'}</span> },
        { key: 'fuelType', label: 'Fuel/Power Type', render: (r) => <span className="text-gray-600 capitalize text-sm">{r.fuelType}</span> },
        { key: 'hourlyCost', label: 'Hourly Cost', render: (r) => <span className="font-bold text-gray-950">LKR {r.hourlyCost?.toLocaleString()}</span> },
        { key: 'capacity', label: 'Capacity (Kg/Hr)', render: (r) => <span className="text-gray-650 text-sm">{r.capacity ? `${r.capacity} Kg/hr` : '--'}</span> },
        { key: 'status', label: 'Status', render: (r) => {
            const variants = { active: 'success', maintenance: 'warning', broken: 'danger' };
            return <Badge variant={variants[r.status] || 'default'}>{r.status}</Badge>;
        }},
        {
            key: 'actions', label: '', width: '100px', render: (r) => (
                <div className="flex gap-1 justify-end">
                    <button onClick={() => openEdit(r)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-900" title="Edit"><Edit size={15} /></button>
                    <button onClick={() => setDeleting(r)} className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded" title="Delete"><Trash2 size={15} /></button>
                </div>
            )
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Machine Registry" 
                description="Manage factory machinery, running costs, and power specs"
                actions={<Button variant="primary" onClick={openNew}><Plus size={16} className="mr-1.5" />Add Machine</Button>} 
            />

            <Card>
                {loading ? (
                    <div className="py-12 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary-500"></div>
                    </div>
                ) : machines.length === 0 ? (
                    <EmptyState 
                        icon={Cpu} 
                        title="No machines registered"
                        description="Add factory machines to compute operational costs automatically during production batches" 
                    />
                ) : (
                    <Table columns={columns} data={machines} />
                )}
            </Card>

            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={editing ? 'Edit Machine' : 'Add Machine'} size="lg">
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Machine Name" 
                            required 
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} 
                        />
                        <Input 
                            label="Machine Code" 
                            required 
                            value={form.code}
                            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} 
                            placeholder="e.g. DRYER-01"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Machine Type" 
                            value={form.type}
                            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} 
                            placeholder="e.g. Dryer, Sifter, Powderer"
                        />
                        <Select 
                            label="Status"
                            options={[
                                { value: 'active', label: 'Active' },
                                { value: 'maintenance', label: 'Under Maintenance' },
                                { value: 'broken', label: 'Broken / Down' }
                            ]}
                            value={form.status} 
                            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} 
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Select 
                            label="Fuel / Power Type"
                            options={[
                                { value: 'electric', label: 'Electric' },
                                { value: 'wood', label: 'Wood' },
                                { value: 'diesel', label: 'Diesel' },
                                { value: 'gas', label: 'Gas' },
                                { value: 'other', label: 'Other' }
                            ]}
                            value={form.fuelType} 
                            onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))} 
                        />
                        <Input 
                            label="Hourly Cost (LKR)" 
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.hourlyCost}
                            onChange={(e) => setForm((f) => ({ ...f, hourlyCost: e.target.value }))} 
                        />
                        <Input 
                            label="Capacity (Kg/Hr)" 
                            type="number"
                            min="0"
                            value={form.capacity}
                            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} 
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submit}>
                        {editing ? 'Update Machine' : 'Add Machine'}
                    </Button>
                </div>
            </Modal>

            <ConfirmDialog 
                isOpen={!!deleting} 
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Delete Machine" 
                message={`Are you sure you want to delete "${deleting?.name}"?`} 
                variant="danger" 
            />
        </div>
    );
}
