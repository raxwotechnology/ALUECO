import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save, Settings2 } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useAdjustStock } from '../features/stock/useStock';
import { useQuery } from '@tanstack/react-query';
import { stockApi } from '../features/stock/stockApi';

const adjustmentReasons = [
    { value: 'physical_count', label: 'Physical count correction' },
    { value: 'damage', label: 'Damage' },
    { value: 'expiry', label: 'Expired' },
    { value: 'shrinkage', label: 'Shrinkage / loss' },
    { value: 'found', label: 'Found stock' },
    { value: 'data_correction', label: 'Data correction' },
    { value: 'other', label: 'Other' },
];

export default function StockAdjustmentPage() {
    const navigate = useNavigate();
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState([{ productId: '', adjustmentQuantity: '', reason: 'physical_count' }]);

    const { data: warehousesData } = useWarehouses({ isActive: true });
    const mutation = useAdjustStock();

    const { data: stockData } = useQuery({
        queryKey: ['stock', 'source', warehouseId],
        queryFn: () => stockApi.list({ warehouseId, limit: 500 }),
        enabled: !!warehouseId,
    });

    const warehouseOptions = (warehousesData?.data || []).map((w) => ({
        value: w._id, label: `${w.name} (${w.warehouseCode})`,
    }));

    const productOptions = useMemo(() => {
        const rawStock = stockData?.data || [];
        const productMap = {};

        rawStock.forEach((s) => {
            if (!s.productId) return;
            const pId = s.productId._id;
            const onHand = s.quantities.onHand || 0;

            if (!productMap[pId]) {
                productMap[pId] = {
                    value: pId,
                    label: s.productName,
                    productName: s.productName,
                    productCode: s.productId.productCode || '—',
                    onHand: 0,
                };
            }
            productMap[pId].onHand += onHand;
        });

        return Object.values(productMap).map((p) => ({
            value: p.value,
            label: `${p.productName} (${p.productCode}) — On hand: ${p.onHand.toFixed(2)}`,
            onHand: p.onHand,
        }));
    }, [stockData]);

    const addLine = () => setLines([...lines, { productId: '', adjustmentQuantity: '', reason: 'physical_count' }]);
    const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));
    const updateLine = (idx, field, value) => {
        const newLines = [...lines];
        newLines[idx] = { ...newLines[idx], [field]: value };
        setLines(newLines);
    };

    const handleSubmit = async () => {
        if (!warehouseId) { toast.error('Select warehouse'); return; }
        const items = lines.filter((l) => l.productId && l.adjustmentQuantity && l.adjustmentQuantity !== '0');
        if (items.length === 0) { toast.error('Add at least one adjustment'); return; }

        try {
            await mutation.mutateAsync({
                warehouseId,
                items: items.map((i) => ({
                    productId: i.productId,
                    adjustmentQuantity: Number(i.adjustmentQuantity),
                    reason: i.reason,
                })),
                notes: notes || undefined,
            });
            navigate('/stock');
        } catch { }
    };

    return (
        <div>
            <PageHeader
                title="Stock Adjustment"
                description="Correct stock levels with a full audit trail"
                actions={<Button variant="outline" onClick={() => navigate('/stock')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>}
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Warehouse</h3>
                        <Select
                            label="Warehouse" required
                            placeholder="Select warehouse..."
                            options={warehouseOptions}
                            value={warehouseId}
                            onChange={(e) => { setWarehouseId(e.target.value); setLines([{ productId: '', adjustmentQuantity: '', reason: 'physical_count' }]); }}
                        />
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">Adjustments</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addLine} disabled={!warehouseId}>
                                <Plus size={14} className="mr-1" /> Add Line
                            </Button>
                        </div>

                        <p className="text-xs text-gray-500 mb-3">
                            Use positive numbers to add stock, negative to remove. Example: -5 means reduce by 5 units.
                        </p>

                        {!warehouseId ? (
                            <p className="text-sm text-gray-500 text-center py-8">Select warehouse first</p>
                        ) : (
                            <div className="space-y-3">
                                {lines.map((line, idx) => {
                                    const selected = productOptions.find((p) => p.value === line.productId);
                                    const qty = Number(line.adjustmentQuantity) || 0;
                                    const newOnHand = selected ? selected.onHand + qty : 0;
                                    const willBeNegative = selected && newOnHand < 0;

                                    return (
                                        <div key={idx} className="border border-gray-200 rounded-lg p-3">
                                            <div className="flex gap-2 items-start">
                                                <span className="text-xs text-gray-500 mt-2 w-6">{idx + 1}</span>
                                                <div className="flex-1 grid grid-cols-6 gap-2">
                                                    <div className="col-span-3">
                                                        <Select
                                                            placeholder="Select product..."
                                                            options={productOptions}
                                                            value={line.productId}
                                                            onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Input
                                                            type="number" step="0.01"
                                                            placeholder="+/- Qty"
                                                            value={line.adjustmentQuantity}
                                                            onChange={(e) => updateLine(idx, 'adjustmentQuantity', e.target.value)}
                                                            error={willBeNegative ? 'Would go negative' : undefined}
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <Select
                                                            options={adjustmentReasons}
                                                            value={line.reason}
                                                            onChange={(e) => updateLine(idx, 'reason', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                {lines.length > 1 && (
                                                    <button type="button" onClick={() => removeLine(idx)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded mt-0.5">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                            {selected && (
                                                <p className="text-xs text-gray-500 ml-8 mt-1">
                                                    {selected.onHand} → <span className={willBeNegative ? 'text-red-600' : 'font-medium'}>{newOnHand}</span>
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    <Card className="p-6">
                        <Textarea label="Overall Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <Settings2 size={24} className="text-primary-600 mb-3" />
                        <h3 className="font-semibold mb-2">Stock Adjustment</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Adjustments are logged permanently with the reason. Use them for corrections after physical counts, damage, or data errors.
                        </p>
                        <Button variant="primary" fullWidth onClick={handleSubmit} loading={mutation.isPending}
                            disabled={!warehouseId || !lines.some((l) => l.productId && l.adjustmentQuantity)}>
                            <Save size={16} className="mr-1.5" /> Save Adjustment
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}