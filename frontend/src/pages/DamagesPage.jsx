import { useState } from 'react';
import { Plus, Search, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Textarea from '../components/ui/Textarea';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useDamages, useCreateDamage, useDamageSummary } from '../features/returns/useReturns';
import { productsApi } from '../features/products/productsApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';

export default function DamagesPage() {
    const [filters, setFilters] = useState({ source: '', page: 1, limit: 15 });
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [warehouseId, setWarehouseId] = useState('');
    const [source, setSource] = useState('warehouse_damage');
    const [description, setDescription] = useState('');
    const [disposition, setDisposition] = useState('pending');
    const [costPerUnit, setCostPerUnit] = useState(0);
    const [adjustStock, setAdjustStock] = useState(true);

    const { data, isLoading } = useDamages(filters);
    const { data: summaryData } = useDamageSummary();
    const { data: productsData } = useQuery({ queryKey: ['products', 'all'], queryFn: () => productsApi.list({ limit: 500 }) });
    const { data: warehousesData } = useWarehouses({ isActive: true });
    const createMutation = useCreateDamage();

    const damages = data?.data || [];
    const summary = summaryData?.data || { bySource: [], totalCount: 0, totalValue: 0 };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const columns = [
        { key: 'damageNumber', label: 'Ref #', render: (r) => <span className="font-mono text-xs">{r.damageNumber}</span> },
        { key: 'createdAt', label: 'Date', render: (r) => fmtDate(r.createdAt) },
        { key: 'product', label: 'Product', render: (r) => <div><p className="text-sm">{r.productName}</p><p className="text-xs text-gray-500 font-mono">{r.productCode}</p></div> },
        { key: 'quantity', label: 'Qty', render: (r) => `${r.quantity} ${r.unitOfMeasure || ''}` },
        { key: 'value', label: 'Value', render: (r) => fmt(r.totalValue) },
        { key: 'source', label: 'Source', render: (r) => <Badge>{r.source.replace(/_/g, ' ')}</Badge> },
        { key: 'disposition', label: 'Disposition', render: (r) => r.disposition.replace(/_/g, ' ') },
        { key: 'writtenOff', label: 'Written off', render: (r) => r.writtenOff ? <Badge variant="danger">Yes</Badge> : <Badge>No</Badge> },
    ];

    const submit = async () => {
        if (!productId || !quantity || !warehouseId) { toast.error('Required fields missing'); return; }
        try {
            await createMutation.mutateAsync({
                productId, quantity: +quantity, warehouseId, source, description,
                disposition, costPerUnit: +costPerUnit, adjustStock,
            });
            setIsFormOpen(false);
            setProductId(''); setQuantity(0); setWarehouseId(''); setDescription('');
        } catch { }
    };

    return (
        <div>
            <PageHeader title="Damages & Scrap Register" description="Track damaged goods across the business"
                actions={<Button variant="primary" onClick={() => setIsFormOpen(true)}>
                    <Plus size={16} className="mr-1.5" /> Record Damage
                </Button>} />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <Card className="p-4"><p className="text-sm text-gray-600">Total Damages Recorded</p><p className="text-2xl font-semibold">{summary.totalCount}</p></Card>
                <Card className="p-4"><p className="text-sm text-gray-600">Total Value Lost</p><p className="text-2xl font-semibold text-red-600">{fmt(summary.totalValue)}</p></Card>
                <Card className="p-4 bg-amber-50 border-amber-200"><p className="text-sm text-amber-700">Top Source</p>
                    <p className="text-lg font-semibold text-amber-900">
                        {summary.bySource[0]?._id?.replace(/_/g, ' ') || '—'}
                    </p>
                </Card>
            </div>

            <Card>
                <div className="p-4 border-b flex gap-3">
                    <div className="w-56">
                        <Select placeholder="All Sources"
                            options={[
                                { value: 'production_reject', label: 'Production reject' },
                                { value: 'warehouse_damage', label: 'Warehouse damage' },
                                { value: 'customer_return', label: 'Customer return' },
                                { value: 'supplier_delivery', label: 'Supplier delivery' },
                                { value: 'transit', label: 'Transit' },
                                { value: 'expired', label: 'Expired' },
                                { value: 'theft', label: 'Theft' },
                                { value: 'other', label: 'Other' },
                            ]}
                            value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value, page: 1 }))} />
                    </div>
                </div>
                {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : damages.length === 0 ? <EmptyState icon={AlertTriangle} title="No damages" description="Record damage when found" />
                        : <><Table columns={columns} data={damages} />
                            <Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0}
                                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} /></>}
            </Card>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Record Damage" size="md">
                <div className="p-6 space-y-4">
                    <Select label="Product" required placeholder="Select product..."
                        options={(productsData?.data || []).map((p) => ({ value: p._id, label: `${p.name} (${p.productCode})` }))}
                        value={productId} onChange={(e) => setProductId(e.target.value)} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Quantity" required type="number" step="0.01" min="0.01"
                            value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                        <Input label="Cost per unit" type="number" step="0.01" min="0"
                            value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} />
                    </div>
                    <Select label="Warehouse" required placeholder="Select..."
                        options={(warehousesData?.data || []).map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseCode})` }))}
                        value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
                    <Select label="Source" required
                        options={[
                            { value: 'warehouse_damage', label: 'Warehouse damage' },
                            { value: 'production_reject', label: 'Production reject' },
                            { value: 'transit', label: 'Transit' },
                            { value: 'expired', label: 'Expired' },
                            { value: 'theft', label: 'Theft' },
                            { value: 'other', label: 'Other' },
                        ]}
                        value={source} onChange={(e) => setSource(e.target.value)} />
                    <Select label="Disposition"
                        options={[
                            { value: 'pending', label: 'Pending' },
                            { value: 'scrap', label: 'Scrap' },
                            { value: 'repair', label: 'Send to repair' },
                            { value: 'return_to_supplier', label: 'Return to supplier' },
                            { value: 'write_off', label: 'Write off' },
                        ]}
                        value={disposition} onChange={(e) => setDisposition(e.target.value)} />
                    <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={adjustStock} onChange={(e) => setAdjustStock(e.target.checked)} />
                        Also decrement stock immediately
                    </label>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submit} loading={createMutation.isPending}>Record</Button>
                </div>
            </Modal>
        </div>
    );
}