import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, Home, Search, RefreshCw } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuthStore } from '../store/authStore';

export default function FarmsPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'procurement_staff'].includes(user?.role);

    const [farms, setFarms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        location: '',
        contactNumber: '',
        notes: '',
        status: 'active'
    });

    const fetchFarms = useCallback(async () => {
        setLoading(true);
        try {
            let url = '/farms';
            const params = [];
            if (search) params.push(`search=${encodeURIComponent(search)}`);
            if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`);
            if (params.length) url += `?${params.join('&')}`;

            const res = await api.get(url);
            setFarms(res.data.data || []);
        } catch (err) {
            toast.error('Failed to fetch farms');
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        fetchFarms();
    }, [fetchFarms]);

    const openForm = (farm = null) => {
        setEditing(farm);
        if (farm) {
            setFormData({
                name: farm.name || '',
                location: farm.location || '',
                contactNumber: farm.contactNumber || '',
                notes: farm.notes || '',
                status: farm.status || 'active'
            });
        } else {
            setFormData({
                name: '',
                location: '',
                contactNumber: '',
                notes: '',
                status: 'active'
            });
        }
        setIsFormOpen(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error('Farm name is required');
            return;
        }

        try {
            if (editing) {
                await api.put(`/farms/${editing._id}`, formData);
                toast.success('Farm updated successfully');
            } else {
                await api.post('/farms', formData);
                toast.success('Farm registered successfully');
            }
            setIsFormOpen(false);
            setEditing(null);
            fetchFarms();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save farm details');
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        try {
            await api.delete(`/farms/${deleting._id}`);
            toast.success('Farm deleted successfully');
            setDeleting(null);
            fetchFarms();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete farm');
        }
    };

    const columns = [
        { key: 'farmCode', label: 'Code', render: (r) => <span className="font-bold text-gray-800">{r.farmCode}</span> },
        { key: 'name', label: 'Name' },
        { key: 'location', label: 'Location' },
        { key: 'contactNumber', label: 'Contact Number' },
        {
            key: 'status',
            label: 'Status',
            render: (r) => (
                <Badge variant={r.status === 'active' ? 'success' : 'default'}>
                    {r.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '120px',
            render: (r) => (
                <div className="flex gap-1">
                    {canManage && (
                        <>
                            <button onClick={() => openForm(r)} className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded">
                                <Edit size={16} />
                            </button>
                            <button onClick={() => setDeleting(r)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Farms Management"
                description="Register and manage source agricultural farms"
                actions={canManage && <Button variant="primary" onClick={() => openForm()}><Plus size={16} className="mr-1.5" />Register Farm</Button>}
            />

            <Card className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-150 w-full sm:w-80">
                        <Search size={16} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search farms by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm w-full"
                        />
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                        <button onClick={fetchFarms} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                            <RefreshCw size={16} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-gray-500">Loading farms...</div>
                ) : farms.length === 0 ? (
                    <EmptyState
                        icon={Home}
                        title="No farms found"
                        description="Register your first farm to track harvests and supply streams"
                        action={canManage && <Button variant="primary" onClick={() => openForm()}><Plus size={16} className="mr-1.5" />Register Farm</Button>}
                    />
                ) : (
                    <Table columns={columns} data={farms} />
                )}
            </Card>

            <Modal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditing(null); }}
                title={editing ? `Edit Farm: ${editing.farmCode}` : 'Register New Farm'}
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <Input
                        label="Farm Name *"
                        placeholder="e.g. Kurunegala Organic Farm"
                        value={formData.name}
                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                        required
                    />

                    <Input
                        label="Location / Address"
                        placeholder="e.g. No. 12, Farm Road, Kurunegala"
                        value={formData.location}
                        onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
                    />

                    <Input
                        label="Contact Number"
                        placeholder="e.g. +94771234567"
                        value={formData.contactNumber}
                        onChange={(e) => setFormData(p => ({ ...p, contactNumber: e.target.value }))}
                    />

                    <Textarea
                        label="Notes / Comments"
                        placeholder="e.g. Main supplier of dried ginger and green tea leaves."
                        value={formData.notes}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                        rows={3}
                    />

                    <Select
                        label="Status"
                        value={formData.status}
                        onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </Select>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button type="button" variant="default" onClick={() => { setIsFormOpen(false); setEditing(null); }}>Cancel</Button>
                        <Button type="submit" variant="primary">{editing ? 'Update Farm' : 'Register Farm'}</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Delete Farm"
                message={`Are you sure you want to delete ${deleting?.name}? This action cannot be undone.`}
            />
        </div>
    );
}
