import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save, ArrowRightLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useTransferStock } from '../features/stock/useStock';
import { stockApi } from '../features/stock/stockApi';

function WarehouseAutocomplete({ label, placeholder, warehouses, value, onChange, disabled }) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    // Sync input value when value changes externally
    useEffect(() => {
        const found = warehouses.find(w => w._id === value);
        if (found) {
            setInputValue(found.name);
        } else {
            setInputValue('');
        }
    }, [value, warehouses]);

    const filtered = warehouses.filter(w =>
        w.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        w.warehouseCode.toLowerCase().includes(inputValue.toLowerCase())
    );

    const handleInputChange = (val) => {
        setInputValue(val);
        setIsOpen(true);

        const matches = warehouses.filter(w =>
            w.name.toLowerCase().includes(val.toLowerCase()) ||
            w.warehouseCode.toLowerCase().includes(val.toLowerCase())
        );

        if (matches.length === 1) {
            onChange(matches[0]._id);
        } else if (val === '') {
            onChange('');
        }
    };

    const handleBlur = () => {
        setTimeout(() => {
            setIsOpen(false);
            if (filtered.length === 1) {
                setInputValue(filtered[0].name);
                onChange(filtered[0]._id);
            } else {
                const exactMatch = warehouses.find(
                    w => w.name.toLowerCase() === inputValue.toLowerCase() ||
                         w.warehouseCode.toLowerCase() === inputValue.toLowerCase()
                );
                if (exactMatch) {
                    setInputValue(exactMatch.name);
                    onChange(exactMatch._id);
                } else {
                    const found = warehouses.find(w => w._id === value);
                    if (found) {
                        setInputValue(found.name);
                    } else {
                        setInputValue('');
                        onChange('');
                    }
                }
            }
        }, 200);
    };

    return (
        <div className="relative w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <input
                type="text"
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setIsOpen(true)}
                onBlur={handleBlur}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 text-sm disabled:bg-gray-55 disabled:text-gray-400 font-medium"
            />
            {isOpen && filtered.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filtered.map(w => (
                        <button
                            key={w._id}
                            type="button"
                            onMouseDown={() => {
                                setInputValue(w.name);
                                onChange(w._id);
                                setIsOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition flex items-center justify-between"
                        >
                            <span className="font-medium text-gray-900">{w.name}</span>
                            <span className="text-gray-400 text-xs font-mono">({w.warehouseCode})</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function StockTransferPage() {
    const navigate = useNavigate();
    const [fromWarehouseId, setFromWarehouseId] = useState('');
    const [toWarehouseId, setToWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState([{ productId: '', quantity: '' }]);

    const { data: warehousesData } = useWarehouses({ isActive: true });
    const mutation = useTransferStock();

    const warehouses = warehousesData?.data || [];

    // Load stock available at source warehouse
    const { data: stockData } = useQuery({
        queryKey: ['stock', 'source', fromWarehouseId],
        queryFn: () => stockApi.list({ warehouseId: fromWarehouseId, limit: 500 }),
        enabled: !!fromWarehouseId,
        staleTime: 0,          // Always treat as stale so we get latest stock
        refetchOnMount: 'always',
    });

    useEffect(() => {
        // Reset lines when source warehouse changes
        setLines([{ productId: '', quantity: '' }]);
    }, [fromWarehouseId]);

    const availableProducts = useMemo(() => {
        const rawStock = stockData?.data || [];
        const productMap = {};

        rawStock.forEach((s) => {
            if (!s.productId) return;
            const pId = s.productId._id;
            const avail = s.quantities.onHand - s.quantities.reserved;
            if (avail <= 0) return;

            if (!productMap[pId]) {
                productMap[pId] = {
                    value: pId,
                    label: s.productName,
                    productName: s.productName,
                    productCode: s.productId.productCode || '—',
                    available: 0,
                    totalValue: 0,
                    warehouseName: s.warehouseId?.name || '—',
                };
            }
            productMap[pId].available += avail;
            productMap[pId].totalValue += avail * (s.costPerUnit || 0);
        });

        return Object.values(productMap).map((p) => {
            const avgCost = p.available > 0 ? p.totalValue / p.available : 0;
            return {
                value: p.value,
                label: `${p.productName} (${p.productCode}) — Available: ${p.available.toFixed(2)} (${p.warehouseName})`,
                available: p.available,
                costPerUnit: avgCost,
                warehouseName: p.warehouseName,
            };
        });
    }, [stockData]);

    const addLine = () => setLines([...lines, { productId: '', quantity: '' }]);
    const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));
    const updateLine = (idx, field, value) => {
        const newLines = [...lines];
        newLines[idx] = { ...newLines[idx], [field]: value };
        setLines(newLines);
    };

    const handleSubmit = async () => {
        if (!fromWarehouseId || !toWarehouseId) { toast.error('Select source and destination'); return; }
        if (fromWarehouseId === toWarehouseId) { toast.error('Source and destination must differ'); return; }
        const items = lines.filter((l) => l.productId && l.quantity);
        if (items.length === 0) { toast.error('Add at least one item'); return; }

        try {
            await mutation.mutateAsync({
                fromWarehouseId, toWarehouseId,
                items: items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
                notes: notes || undefined,
            });
            navigate('/stock');
        } catch { }
    };

    const totalTransferValue = lines.reduce((sum, line) => {
        const selected = availableProducts.find((p) => p.value === line.productId);
        const qty = Number(line.quantity) || 0;
        const cost = selected ? selected.costPerUnit : 0;
        return sum + (qty * cost);
    }, 0);

    return (
        <div>
            <PageHeader
                title="Stock Transfer"
                description="Move stock between warehouses"
                actions={<Button variant="outline" onClick={() => navigate('/stock')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>}
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Route</h3>
                        <div className="grid grid-cols-2 gap-6 items-center">
                            <WarehouseAutocomplete
                                label="From Warehouse"
                                placeholder="Type to search source warehouse..."
                                warehouses={warehouses}
                                value={fromWarehouseId}
                                onChange={setFromWarehouseId}
                            />
                            <WarehouseAutocomplete
                                label="To Warehouse"
                                placeholder="Type to search destination..."
                                warehouses={warehouses.filter((w) => w._id !== fromWarehouseId)}
                                value={toWarehouseId}
                                onChange={setToWarehouseId}
                                disabled={!fromWarehouseId}
                            />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">Items to Transfer</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addLine}
                                disabled={!fromWarehouseId}>
                                <Plus size={14} className="mr-1" /> Add Item
                            </Button>
                        </div>

                        {!fromWarehouseId ? (
                            <p className="text-sm text-gray-500 text-center py-8">Select source warehouse first</p>
                        ) : availableProducts.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">No stock available at source warehouse</p>
                        ) : (
                            <div className="space-y-3">
                                {lines.map((line, idx) => {
                                    const selected = availableProducts.find((p) => p.value === line.productId);
                                    const qty = Number(line.quantity) || 0;
                                    const exceeds = selected && qty > selected.available;
                                    const cost = selected ? selected.costPerUnit : 0;
                                    const lineVal = qty * cost;

                                    return (
                                        <div key={idx} className="border border-gray-200 rounded-lg p-3">
                                            <div className="flex gap-2 items-start">
                                                <span className="text-xs text-gray-500 mt-2 w-6">{idx + 1}</span>
                                                <div className="flex-1 grid grid-cols-12 gap-2">
                                                    <div className="col-span-7">
                                                        <Select
                                                            placeholder="Select product..."
                                                            options={availableProducts}
                                                            value={line.productId}
                                                            onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                                                        />
                                                        {selected && (
                                                            <div className="mt-1 flex justify-between text-xs text-gray-500 px-1">
                                                                <span>Location: <strong className="text-gray-700">{selected.warehouseName}</strong></span>
                                                                <span>Unit Cost: <strong className="text-gray-700">Rs. {selected.costPerUnit.toFixed(2)}</strong></span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="col-span-3">
                                                        <Input
                                                            type="number" step="0.01" min="0.01"
                                                            placeholder="Qty"
                                                            value={line.quantity}
                                                            onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                                            error={exceeds ? `Max ${selected.available}` : undefined}
                                                        />
                                                    </div>
                                                    <div className="col-span-2 flex items-center justify-end pr-2 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-xs text-gray-400">Value</span>
                                                            <span className="text-sm font-semibold text-gray-800">
                                                                Rs. {lineVal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {lines.length > 1 && (
                                                    <button type="button" onClick={() => removeLine(idx)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded mt-0.5">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    <Card className="p-6">
                        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <ArrowRightLeft size={24} className="text-primary-600 mb-3" />
                        <h3 className="font-semibold mb-2">Transfer Summary</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Each item decreases at source and increases at destination. Two movements per line in the audit log.
                        </p>
                        <div className="border-t border-b border-gray-150 py-3 mb-4 flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-600">Total Transfer Value:</span>
                            <span className="text-lg font-bold text-emerald-600">
                                Rs. {totalTransferValue.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                        <Button variant="primary" fullWidth onClick={handleSubmit} loading={mutation.isPending}
                            disabled={!fromWarehouseId || !toWarehouseId || !lines.some((l) => l.productId && l.quantity)}>
                            <Save size={16} className="mr-1.5" /> Execute Transfer
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}