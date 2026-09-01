import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, TruckIcon, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

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
import { useSupplierReturns, useCreateSupplierReturn } from '../features/returns/useReturns';
import { suppliersApi } from '../features/suppliers/suppliersApi';
import { productsApi } from '../features/products/productsApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';

export default function SupplierReturnsPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({ status: '', page: 1, limit: 15 });
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [supplierId, setSupplierId] = useState('');
    const [warehouseId, setWarehouseId] = useState('');
    const [items, setItems] = useState([{ productId: '', quantity: 1, unitPrice: 0, reason: 'damaged' }]);
    const [notes, setNotes] = useState('');

    const { data, isLoading } = useSupplierReturns(filters);
    const { data: suppliersData } = useQuery({ queryKey: ['suppliers', 'active'], queryFn: () => suppliersApi.list({ status: 'active', limit: 200 }) });
    const { data: productsData } = useQuery({ queryKey: ['products', 'raw'], queryFn: () => productsApi.list({ limit: 500 }) });
    const { data: warehousesData } = useWarehouses({ isActive: true });
    const createMutation = useCreateSupplierReturn();

    const returns = data?.data || [];
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const totalValue = useMemo(() => items.reduce((s, i) => s + (+i.quantity || 0) * (+i.unitPrice || 0), 0), [items]);

    const columns = [
        { key: 'returnNumber', label: 'Ref #', render: (r) => <span className="font-mono text-xs">{r.returnNumber}</span> },
        { key: 'returnDate', label: 'Date', render: (r) => fmtDate(r.returnDate) },
        { key: 'supplier', label: 'Supplier', render: (r) => r.supplierSnapshot?.name },
        { key: 'items', label: 'Items', render: (r) => r.items?.length },
        { key: 'value', label: 'Return Value', render: (r) => fmt(r.totalReturnValue) },
        { key: 'source', label: 'Source', render: (r) => r.sourceDocument?.type === 'damage_record' ? (
            <button 
                onClick={() => navigate(`/damages`)}
                className="flex items-center gap-1 text-orange-600 hover:text-orange-800 text-sm"
            >
                <AlertTriangle size={14} />
                {r.sourceDocument.number}
            </button>
        ) : <span className="text-gray-400 text-sm">—</span> },
        { key: 'credit', label: 'Credit', render: (r) => r.actualCreditReceived > 0 ? fmt(r.actualCreditReceived) : <span className="text-gray-400">—</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge>{r.status.replace(/_/g, ' ')}</Badge> },
        { key: 'actions', label: '', width: '50px', render: (r) => <button onClick={() => navigate(`/supplier-returns/${r._id}`)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={16} /></button> },
    ];

    const addLine = () => setItems([...items, { productId: '', quantity: 1, unitPrice: 0, reason: 'damaged' }]);
    const removeLine = (idx) => setItems(items.filter((_, i) => i !== idx));
    const updateLine = (idx, f, v) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [f]: v };
        if (f === 'productId' && v) {
            const p = productsData?.data?.find((x) => x._id === v);
            if (p) newItems[idx].unitPrice = p.costs?.lastPurchaseCost || p.costs?.averageCost || 0;
        }
        setItems(newItems);
    };

    const submit = async () => {
        if (!supplierId || !warehouseId) { toast.error('Select supplier and warehouse'); return; }
        if (items.some((i) => !i.productId || !i.quantity)) { toast.error('All items need product and qty'); return; }
        try {
            const result = await createMutation.mutateAsync({
                supplierId, warehouseId,
                items: items.map((i) => ({
                    productId: i.productId, quantity: +i.quantity, unitPrice: +i.unitPrice,
                    reason: i.reason, reasonDescription: i.reasonDescription,
                })),
                notes: notes || undefined,
            });
            setIsFormOpen(false);
            navigate(`/supplier-returns/${result.data._id}`);
        } catch { }
    };

    return (
        <div>
            <PageHeader title="Supplier Returns" description="Send defective goods back to suppliers"
                actions={<Button variant="primary" onClick={() => setIsFormOpen(true)}>
                    <Plus size={16} className="mr-1.5" /> New Supplier Return
                </Button>} />

            <Card>
                <div className="p-4 border-b flex gap-3">
                    <div className="w-48">
                        <Select placeholder="All Statuses"
                            options={[
                                { value: 'draft', label: 'Draft' }, { value: 'sent', label: 'Sent' },
                                { value: 'credit_received', label: 'Credit Received' }, { value: 'cancelled', label: 'Cancelled' },
                            ]}
                            value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                    </div>
                </div>
                {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div>
                    : returns.length === 0 ? <EmptyState icon={TruckIcon} title="No supplier returns" description="Create one when returning goods to supplier" />
                        : <><Table columns={columns} data={returns} onRowClick={(r) => navigate(`/supplier-returns/${r._id}`)} />
                            <Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0}
                                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} /></>}
            </Card>

            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="New Supplier Return" size="lg">
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Select label="Supplier" required placeholder="Select..."
                            options={(suppliersData?.data || []).map((s) => ({ value: s._id, label: `${s.displayName} (${s.supplierCode})` }))}
                            value={supplierId} onChange={(e) => setSupplierId(e.target.value)} />
                        <Select label="From Warehouse" required placeholder="Select..."
                            options={(warehousesData?.data || []).map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseCode})` }))}
                            value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <h4 className="text-sm font-semibold">Items</h4>
                            <Button type="button" variant="outline" size="sm" onClick={addLine}>Add Line</Button>
                        </div>
                        <div className="space-y-2">
                            {items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-5 gap-2 border rounded p-2">
                                    <div className="col-span-2">
                                        <Select placeholder="Product..."
                                            options={(productsData?.data || []).map((p) => ({ value: p._id, label: `${p.name}` }))}
                                            value={item.productId} onChange={(e) => updateLine(idx, 'productId', e.target.value)} />
                                    </div>
                                    <Input type="number" step="0.01" min="0.01" placeholder="Qty" value={item.quantity}
                                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                                    <Input type="number" step="0.01" min="0" placeholder="Unit Price" value={item.unitPrice}
                                        onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)} />
                                    <Select options={[
                                        { value: 'damaged', label: 'Damaged' },
                                        { value: 'defective', label: 'Defective' },
                                        { value: 'wrong_item', label: 'Wrong item' },
                                        { value: 'expired', label: 'Expired' },
                                        { value: 'quality_issue', label: 'Quality issue' },
                                        { value: 'other', label: 'Other' },
                                    ]}
                                        value={item.reason} onChange={(e) => updateLine(idx, 'reason', e.target.value)} />
                                </div>
                            ))}
                        </div>
                    </div>
                    <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    <div className="flex justify-between pt-3 border-t">
                        <span className="font-semibold">Total Return Value</span>
                        <span className="font-bold">{fmt(totalValue)}</span>
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={submit} loading={createMutation.isPending}>Create Return</Button>
                </div>
            </Modal>
        </div>
    );
}