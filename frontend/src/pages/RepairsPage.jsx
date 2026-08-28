import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Wrench, AlertTriangle, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { useRepairs, useCreateRepair } from '../features/returns/useReturns';
import { repairsApi } from '../features/returns/returnsApi';
import { productsApi } from '../features/products/productsApi';

const statusVariant = {
    pending: 'default', in_progress: 'warning', awaiting_parts: 'warning',
    completed_fixed: 'success', completed_unfixable: 'danger', cancelled: 'default',
};

export default function RepairsPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ status: '', page: 1, limit: 15 });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [issueDescription, setIssueDescription] = useState('');
    const [estimatedCost, setEstimatedCost] = useState(0);
    const { data, isLoading } = useRepairs(filters);
    const { data: productsData } = useQuery({ queryKey: ['products', 'all'], queryFn: () => productsApi.list({ limit: 500 }) });
    const createMutation = useCreateRepair();
    const repairs = data?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const columns = [
        { key: 'repairNumber', label: 'Ref #', render: (r) => <span className="font-mono text-xs">{r.repairNumber}</span> },
        { key: 'createdAt', label: 'Date', render: (r) => fmtDate(r.createdAt) },
        { key: 'product', label: 'Product', render: (r) => r.productName },
        { key: 'quantity', label: 'Qty', render: (r) => r.quantity },
        { key: 'issue', label: 'Issue', render: (r) => <span className="text-sm truncate max-w-xs block">{r.issueDescription}</span> },
        { key: 'cost', label: 'Total Cost', render: (r) => fmt(r.totalActualCost) },
        { key: 'source', label: 'Source', render: (r) => r.sourceDocument?.type === 'damage_record' ? (
            <button 
                onClick={() => navigate(`/damages`)}
                className="flex items-center gap-1 text-orange-600 hover:text-orange-800 text-sm"
            >
                <AlertTriangle size={14} />
                {r.sourceDocument.number}
            </button>
        ) : r.customerReturnId ? (
            <span className="text-sm text-gray-600">{r.customerReturnId.rmaNumber}</span>
        ) : <span className="text-gray-400 text-sm">—</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status.replace(/_/g, ' ')}</Badge> },
        {
            key: 'actions', label: '', width: '50px', render: (r) => (
                <button onClick={() => navigate(`/repairs/${r._id}`)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={16} /></button>
            )
        },
    ];

    const submit = async () => {
        if (!productId || !quantity) { toast.error('Required fields missing'); return; }
        try {
            await createMutation.mutateAsync({
                productId,
                quantity: +quantity,
                issueDescription,
                estimatedCost: +estimatedCost,
                sourceType: 'manual',
            });
            setIsFormOpen(false);
            setProductId('');
            setQuantity(1);
            setIssueDescription('');
            setEstimatedCost(0);
        } catch (error) {
            // Error is handled by the mutation
        }
    };

    return (
        <div>
            <PageHeader title="Repairs Workshop" description="Track items being repaired"
                actions={<Button variant="primary" onClick={() => setIsFormOpen(true)}>
                    <Plus size={16} className="mr-1.5" /> Add Repair
                </Button>} />
            <Card>
                <div className="p-3 sm:p-4 border-b flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <div className="w-full sm:w-48">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' },
                                { value: 'awaiting_parts', label: 'Awaiting Parts' }, { value: 'completed_fixed', label: 'Fixed' },
                                { value: 'completed_unfixable', label: 'Unfixable' },
                            ]}
                            value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                    </div>
                </div>
                {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : repairs.length === 0 ? <EmptyState icon={Wrench} title="No repairs" description="Repairs are created when returns or damage records have disposition 'repair'" />
                        : <><Table columns={columns} data={repairs} onRowClick={(r) => navigate(`/repairs/${r._id}`)} />
                            <Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0}
                                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} /></>}
            </Card>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="New Repair Order" size="md">
                <div className="p-6 space-y-4">
                    <Select label="Product" required placeholder="Select product..."
                        options={(productsData?.data || []).map((p) => ({ value: p._id, label: `${p.name} (${p.productCode})` }))}
                        value={productId} onChange={(e) => setProductId(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Quantity" required type="number" step="0.01" min="1"
                            value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                        <Input label="Estimated Cost" type="number" step="0.01" min="0"
                            value={estimatedCost} onChange={(e) => setEstimatedCost(e.target.value)} />
                    </div>
                    <Textarea label="Issue Description" rows={3} value={issueDescription} onChange={(e) => setIssueDescription(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submit}>Create Repair</Button>
                </div>
            </Modal>
        </div>
    );
}