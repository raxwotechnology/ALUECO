import { useState } from 'react';
import { Plus, Edit, Trash2, Search, UserCog, ShieldCheck, ShieldOff, Mail, Phone } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import UserFormModal from '../features/users/UserFormModal';
import { useUsers, useDeleteUser } from '../features/users/useUsers';
import { ROLES, getRoleConfig } from '../features/users/roleConfig';
import { useAuthStore } from '../store/authStore';

export default function UsersPage() {
    const { user: currentUser } = useAuthStore();

    const [filters, setFilters] = useState({ search: '', role: '', isActive: '', page: 1, limit: 20 });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deactivating, setDeactivating] = useState(null);

    const { data, isLoading } = useUsers(filters);
    const deleteMutation = useDeleteUser();

    const users = data?.data || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / filters.limit);

    const roleOptions = ROLES.map((r) => ({ value: r.value, label: r.label }));

    const columns = [
        {
            key: 'name', label: 'Name',
            render: (r) => (
                <div>
                    <p className="font-medium text-gray-900">
                        {r.firstName} {r.lastName}
                        {r._id === currentUser._id && (
                            <Badge className="ml-2" variant="info">You</Badge>
                        )}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Mail size={10} /> {r.email}
                    </p>
                    {r.phone && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone size={10} /> {r.phone}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'role', label: 'Role',
            render: (r) => {
                const cfg = getRoleConfig(r.role);
                return (
                    <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: cfg.color }}>
                        {cfg.label}
                    </span>
                );
            },
        },
        {
            key: 'isActive', label: 'Status',
            render: (r) => r.isActive
                ? <Badge variant="success"><ShieldCheck size={10} className="inline mr-1" />Active</Badge>
                : <Badge variant="default"><ShieldOff size={10} className="inline mr-1" />Inactive</Badge>,
        },
        {
            key: 'lastLogin', label: 'Last Login',
            render: (r) => r.lastLoginAt
                ? new Date(r.lastLoginAt).toLocaleDateString('en-LK')
                : <span className="text-gray-400 text-xs">Never</span>,
        },
        {
            key: 'createdAt', label: 'Added',
            render: (r) => new Date(r.createdAt).toLocaleDateString('en-LK'),
        },
        {
            key: 'actions', label: 'Actions', width: '120px',
            render: (r) => (
                <div className="flex gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); setEditing(r); setIsFormOpen(true); }}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="Edit">
                        <Edit size={16} />
                    </button>
                    {r._id !== currentUser._id && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setDeactivating(r); }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Deactivate">
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const handleDelete = async () => {
        await deleteMutation.mutateAsync(deactivating._id);
        setDeactivating(null);
    };

    // Summary counts
    const activeCount = users.filter((u) => u.isActive).length;
    const inactiveCount = users.length - activeCount;
    const roleCounts = ROLES.reduce((acc, r) => {
        acc[r.value] = users.filter((u) => u.role === r.value).length;
        return acc;
    }, {});

    return (
        <div>
            <PageHeader
                title="Users"
                description="Manage team members and their access levels"
                actions={
                    <Button variant="primary" onClick={() => { setEditing(null); setIsFormOpen(true); }}>
                        <Plus size={16} className="mr-1.5" /> Add User
                    </Button>
                }
            />

            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-2xl font-semibold">{total}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-gray-600">Active</p>
                    <p className="text-2xl font-semibold text-green-600">{activeCount}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-gray-600">Inactive</p>
                    <p className="text-2xl font-semibold text-gray-500">{inactiveCount}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-gray-600">Admins</p>
                    <p className="text-2xl font-semibold text-red-600">{roleCounts.admin || 0}</p>
                </Card>
            </div>

            <Card>
                <div className="p-4 border-b flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search by name or email..."
                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-48">
                        <Select placeholder="All Roles" options={roleOptions}
                            value={filters.role}
                            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value, page: 1 }))} />
                    </div>
                    <div className="w-40">
                        <Select placeholder="All"
                            options={[
                                { value: 'true', label: 'Active only' },
                                { value: 'false', label: 'Inactive only' },
                            ]}
                            value={filters.isActive}
                            onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value, page: 1 }))} />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading users...</div>
                ) : users.length === 0 ? (
                    <EmptyState icon={UserCog} title="No users"
                        description="Add your first team member"
                        action={<Button variant="primary" onClick={() => setIsFormOpen(true)}>
                            <Plus size={16} className="mr-1.5" /> Add User
                        </Button>} />
                ) : (
                    <>
                        <Table columns={columns} data={users} />
                        <Pagination page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                    </>
                )}
            </Card>

            <UserFormModal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditing(null); }}
                user={editing}
            />

            <ConfirmDialog
                isOpen={!!deactivating}
                onClose={() => setDeactivating(null)}
                onConfirm={handleDelete}
                title="Deactivate User"
                message={
                    <div>
                        <p className="mb-2">
                            Deactivate <strong>{deactivating?.firstName} {deactivating?.lastName}</strong>?
                        </p>
                        <p className="text-sm text-gray-600">
                            They will no longer be able to log in. Their historical records (orders, approvals) remain intact.
                        </p>
                    </div>
                }
                confirmText="Deactivate"
                variant="danger"
                loading={deleteMutation.isPending}
            />
        </div>
    );
}