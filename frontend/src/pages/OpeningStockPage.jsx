import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save, PackagePlus, AlertTriangle } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { productsApi } from '../features/products/productsApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useOpeningStock } from '../features/stock/useStock';

export default function OpeningStockPage() {
    const navigate = useNavigate();
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState([{ productId: '', quantity: '', costPerUnit: '' }]);

    const { data: warehousesData } = useWarehouses({ isActive: true });
    const { data: productsData } = useQuery({
        queryKey: ['products', 'active', 'all'],
        queryFn: () => productsApi.list({ status: 'active', limit: 500 }),
    });

    const mutation = useOpeningStock();

    const warehouseOptions = (warehousesData?.data || []).map((w) => ({
        value: w._id, label: `${w.name} (${w.warehouseCode})`,
    }));
    const productOptions = (productsData?.data || []).map((p) => ({
        value: p._id,
        label: `${p.name} — ${p.productCode}`,
        unitOfMeasure: p.unitOfMeasure || '',
        lastPurchaseCost: p.costs?.lastPurchaseCost || 0,
        averageCost: p.costs?.averageCost || 0,
        basePrice: p.basePrice || 0,
    }));

    const addLine = () => setLines([...lines, { productId: '', quantity: '', costPerUnit: '' }]);
    const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));

    const updateLine = (idx, field, value) => {
        const newLines = [...lines];
        newLines[idx] = { ...newLines[idx], [field]: value };

        // When product is selected, always auto-fill cost from product's known cost data
        if (field === 'productId' && value) {
            const product = productOptions.find((p) => p.value === value);
            if (product) {
                // Priority: lastPurchaseCost → averageCost → basePrice → 0
                const autoCost = product.lastPurchaseCost || product.averageCost || product.basePrice || '';
                newLines[idx].costPerUnit = autoCost;
            }
        }
        setLines(newLines);
    };

    const getProductMeta = (productId) => productOptions.find((p) => p.value === productId);

    const handleSubmit = async () => {
        if (!warehouseId) { toast.error('Select warehouse'); return; }
        const items = lines.filter((l) => l.productId && l.quantity);
        if (items.length === 0) { toast.error('Add at least one item'); return; }

        // Warn if any cost is zero
        const zeroCostItems = items.filter((i) => !Number(i.costPerUnit));
        if (zeroCostItems.length > 0) {
            const ok = window.confirm(
                `${zeroCostItems.length} item(s) have Cost = 0. This means no value will be tracked for them. Continue?`
            );
            if (!ok) return;
        }

        try {
            await mutation.mutateAsync({
                warehouseId,
                items: items.map((i) => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    costPerUnit: Number(i.costPerUnit) || 0,
                })),
                notes: notes || undefined,
            });
            navigate('/stock');
        } catch { }
    };

    const totalValue = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.costPerUnit) || 0), 0);
    const fmt = (n) => new Intl.NumberFormat('en-LK', {
        style: 'currency', currency: 'LKR', minimumFractionDigits: 2,
    }).format(n || 0);

    return (
        <div>
            <PageHeader
                title="Opening Stock Entry"
                description="Record initial inventory quantities and their purchase costs"
                actions={
                    <Button variant="outline" onClick={() => navigate('/stock')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back
                    </Button>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    {/* Warehouse */}
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Target Warehouse</h3>
                        <Select
                            label="Warehouse" required
                            placeholder="Select warehouse..."
                            options={warehouseOptions}
                            value={warehouseId}
                            onChange={(e) => setWarehouseId(e.target.value)}
                        />
                    </Card>

                    {/* Stock Lines */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700">Stock Items</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Enter the product, quantity and <strong>unit cost (purchase price)</strong> for each item.
                                </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addLine}>
                                <Plus size={14} className="mr-1" /> Add Line
                            </Button>
                        </div>

                        {/* Column headers */}
                        <div className="hidden sm:grid grid-cols-12 gap-2 px-1 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            <div className="col-span-5">Product</div>
                            <div className="col-span-2 text-right">Qty</div>
                            <div className="col-span-1 text-center">Unit</div>
                            <div className="col-span-2 text-right">Unit Cost (Rs.)</div>
                            <div className="col-span-2 text-right pr-8">Total Value</div>
                        </div>

                        <div className="space-y-2">
                            {lines.map((line, idx) => {
                                const meta = getProductMeta(line.productId);
                                const qty = Number(line.quantity) || 0;
                                const cost = Number(line.costPerUnit) || 0;
                                const lineValue = qty * cost;
                                const noCost = line.productId && !cost;

                                return (
                                    <div key={idx} className={`border rounded-lg p-3 transition-colors ${noCost ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
                                        <div className="flex gap-2 items-center">
                                            <span className="text-xs text-gray-400 w-5 shrink-0">{idx + 1}</span>

                                            <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                                                {/* Product */}
                                                <div className="col-span-5">
                                                    <Select
                                                        placeholder="Select product..."
                                                        options={productOptions}
                                                        value={line.productId}
                                                        onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                                                    />
                                                </div>

                                                {/* Qty */}
                                                <div className="col-span-2">
                                                    <Input
                                                        type="number" step="0.01" min="0.01"
                                                        placeholder="Qty"
                                                        value={line.quantity}
                                                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                                    />
                                                </div>

                                                {/* Unit */}
                                                <div className="col-span-1 text-center">
                                                    <span className="text-xs text-gray-500 font-medium">
                                                        {meta?.unitOfMeasure || '—'}
                                                    </span>
                                                </div>

                                                {/* Cost per unit */}
                                                <div className="col-span-2 relative">
                                                    <Input
                                                        type="number" step="0.01" min="0"
                                                        placeholder="0.00"
                                                        value={line.costPerUnit}
                                                        onChange={(e) => updateLine(idx, 'costPerUnit', e.target.value)}
                                                    />
                                                    {noCost && (
                                                        <span className="absolute -top-2 right-0 bg-amber-500 text-white text-[9px] font-bold px-1 py-0.5 rounded">
                                                            Enter cost!
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Line total */}
                                                <div className="col-span-2 text-right">
                                                    <span className={`text-sm font-semibold ${lineValue > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
                                                        {fmt(lineValue)}
                                                    </span>
                                                </div>
                                            </div>

                                            {lines.length > 1 && (
                                                <button type="button" onClick={() => removeLine(idx)}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded ml-1 shrink-0">
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Auto-fill hint */}
                                        {meta && (meta.lastPurchaseCost > 0 || meta.averageCost > 0) && (
                                            <p className="text-[11px] text-gray-400 mt-1.5 ml-7">
                                                Last cost: <strong className="text-gray-600">Rs. {(meta.lastPurchaseCost || meta.averageCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong>
                                                {' '}· avg: <strong className="text-gray-600">Rs. {(meta.averageCost || meta.lastPurchaseCost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong>
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end mt-4 pt-4 border-t">
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Total stock value</p>
                                <p className="text-xl font-bold text-primary-600">{fmt(totalValue)}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </Card>
                </div>

                {/* Sidebar */}
                <div>
                    <Card className="p-6 sticky top-6">
                        <PackagePlus size={24} className="text-primary-600 mb-3" />
                        <h3 className="font-semibold mb-2">Opening Stock</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Record existing inventory when starting. Each line creates an audit trail movement.
                        </p>

                        {/* Tips */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800 space-y-1">
                            <p className="font-semibold">💡 Tips:</p>
                            <p>• <strong>Unit Cost</strong> = purchase price per unit</p>
                            <p>• Auto-filled from last purchase when you pick a product</p>
                            <p>• You can edit it if the cost is different</p>
                            <p>• Cost 0 = no stock value tracked</p>
                        </div>

                        <div className="space-y-2 text-sm mb-4">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Lines</span>
                                <span>{lines.filter((l) => l.productId).length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">No cost set</span>
                                <span className={lines.filter((l) => l.productId && !Number(l.costPerUnit)).length > 0 ? 'text-amber-600 font-semibold' : 'text-gray-400'}>
                                    {lines.filter((l) => l.productId && !Number(l.costPerUnit)).length}
                                </span>
                            </div>
                            <div className="flex justify-between font-medium border-t pt-2">
                                <span>Total Value</span>
                                <span className="text-primary-600">{fmt(totalValue)}</span>
                            </div>
                        </div>

                        {lines.some((l) => l.productId && !Number(l.costPerUnit)) && (
                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 text-xs text-amber-800">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                                <p>Some items have no cost set. Enter <strong>Unit Cost</strong> for accurate stock valuation.</p>
                            </div>
                        )}

                        <Button variant="primary" fullWidth onClick={handleSubmit} loading={mutation.isPending}
                            disabled={!warehouseId || !lines.some((l) => l.productId && l.quantity)}>
                            <Save size={16} className="mr-1.5" /> Save Opening Stock
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}