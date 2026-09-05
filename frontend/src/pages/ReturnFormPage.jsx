import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    ArrowLeft, Save, Trash2, Plus, ShoppingCart,
    ChevronRight, PackageX, CheckCircle2, AlertCircle,
    User, Package,
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { customersApi } from '../features/customers/customersApi';
import { useCreateReturn } from '../features/returns/useReturns';
import api from '../api/axios';

const reasonOptions = [
    { value: 'damaged_on_arrival', label: 'Damaged on arrival' },
    { value: 'defective', label: 'Defective' },
    { value: 'wrong_item', label: 'Wrong item sent' },
    { value: 'not_as_described', label: 'Not as described' },
    { value: 'expired', label: 'Expired' },
    { value: 'overshipped', label: 'Over-shipped' },
    { value: 'customer_changed_mind', label: 'Changed mind' },
    { value: 'late_delivery', label: 'Late delivery' },
    { value: 'other', label: 'Other' },
];

export default function ReturnFormPage() {
    const navigate = useNavigate();
    const createMutation = useCreateReturn();

    const [customerId, setCustomerId] = useState('');
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [items, setItems] = useState([]);
    const [customerNotes, setCustomerNotes] = useState('');
    const [internalNotes, setInternalNotes] = useState('');

    // ── Customers ──
    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 500 }),
    });

    // ── Eligible Orders for selected customer ──
    const { data: ordersData, isLoading: ordersLoading } = useQuery({
        queryKey: ['eligibleOrdersForReturn', customerId],
        queryFn: async () => {
            if (!customerId) return { data: [] };
            const res = await api.get('/customer-returns/eligible-orders', { params: { customerId } });
            return res.data;
        },
        enabled: !!customerId,
    });

    const customers = customersData?.data || [];
    const orders = ordersData?.data || [];
    const customerOptions = customers.map((c) => ({ value: c._id, label: `${c.displayName} (${c.customerCode})` }));

    // ── All returnable items from CHECKED orders ──
    const availableItems = useMemo(() => {
        const list = [];
        orders
            .filter((o) => selectedOrderIds.includes(o._id))
            .forEach((o) => {
                o.items.forEach((item) => {
                    const remaining = item.remainingReturnableQuantity ?? item.orderedQuantity ?? 0;
                    if (remaining <= 0) return; // skip fully-returned items
                    list.push({
                        salesOrderId: o._id,
                        salesOrderLineId: item._id,
                        orderNumber: o.orderNumber,
                        productId: item.productId?._id || item.productId,
                        productCode: item.productCode,
                        productName: item.productName,
                        unitPrice: item.unitPrice || 0,
                        unitOfMeasure: item.unitOfMeasure,
                        maxQty: remaining,
                        remainingReturnableQuantity: remaining,
                        alreadyReturnedQuantity: item.alreadyReturnedQuantity || 0,
                        orderedQuantity: item.orderedQuantity || 0,
                    });
                });
            });
        return list;
    }, [orders, selectedOrderIds]);

    // Items not yet added to the return list
    const unpickedItems = availableItems.filter(
        (ai) => !items.find((i) => i.salesOrderLineId === ai.salesOrderLineId)
    );

    const toggleOrder = (id) => {
        setSelectedOrderIds((p) =>
            p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
        );
    };

    const addItem = (src) => {
        setItems((prev) => [
            ...prev,
            {
                salesOrderId: src.salesOrderId,
                salesOrderLineId: src.salesOrderLineId,
                productId: src.productId,
                productCode: src.productCode,
                productName: src.productName,
                unitPrice: src.unitPrice,
                unitOfMeasure: src.unitOfMeasure,
                maxQty: src.maxQty,
                remainingReturnableQuantity: src.remainingReturnableQuantity,
                alreadyReturnedQuantity: src.alreadyReturnedQuantity,
                orderedQuantity: src.orderedQuantity,
                quantityReturned: 1,
                reason: 'damaged_on_arrival',
                reasonDescription: '',
                refundable: true,
                restockingFeePercent: 0,
            },
        ]);
    };

    const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
    const updateItem = (idx, field, value) => {
        setItems((prev) => {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], [field]: value };
            return copy;
        });
    };

    const totals = useMemo(() => {
        const value = items.reduce((s, i) => s + (+i.quantityReturned || 0) * (+i.unitPrice || 0), 0);
        const restocking = items.reduce(
            (s, i) => s + (+i.quantityReturned || 0) * (+i.unitPrice || 0) * (+i.restockingFeePercent || 0) / 100,
            0
        );
        const refund = items
            .filter((i) => i.refundable)
            .reduce(
                (s, i) =>
                    s +
                    (+i.quantityReturned || 0) * (+i.unitPrice || 0) -
                    (+i.quantityReturned || 0) * (+i.unitPrice || 0) * (+i.restockingFeePercent || 0) / 100,
                0
            );
        return { value: +value.toFixed(2), refund: +refund.toFixed(2), restocking: +restocking.toFixed(2) };
    }, [items]);

    const fmt = (n) =>
        new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const submit = async () => {
        if (!customerId) { toast.error('Please select a customer'); return; }
        if (items.length === 0) { toast.error('Add at least one item to return'); return; }

        const invalidQty = items.find(
            (i) => !i.quantityReturned || +i.quantityReturned <= 0 || +i.quantityReturned > i.maxQty
        );
        if (invalidQty) {
            toast.error(`Invalid quantity for "${invalidQty.productName}". Max allowed: ${invalidQty.maxQty}`);
            return;
        }

        try {
            const result = await createMutation.mutateAsync({
                customerId,
                salesOrderIds: selectedOrderIds,
                items: items.map((i) => ({
                    productId: i.productId || undefined,
                    productCode: i.productCode,
                    productName: i.productName,
                    quantityReturned: +i.quantityReturned,
                    unitPrice: +i.unitPrice,
                    reason: i.reason,
                    reasonDescription: i.reasonDescription || undefined,
                    refundable: i.refundable,
                    restockingFeePercent: +i.restockingFeePercent || 0,
                    salesOrderId: i.salesOrderId,
                    salesOrderLineId: i.salesOrderLineId,
                })),
                customerNotes: customerNotes || undefined,
                internalNotes: internalNotes || undefined,
            });
            toast.success('RMA created successfully!');
            navigate(`/returns/${result.data._id}`);
        } catch { }
    };

    // ── Step indicator ──
    const step = !customerId ? 1 : selectedOrderIds.length === 0 ? 2 : 3;

    return (
        <div>
            <PageHeader
                title="New Return Request (RMA)"
                subtitle="Follow the 3 steps below to create a customer return"
                actions={
                    <Button variant="outline" onClick={() => navigate('/returns')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back
                    </Button>
                }
            />

            {/* ── Step indicator bar ── */}
            <div className="flex items-center gap-0 mb-6 bg-white border border-gray-200 rounded-xl p-4">
                {[
                    { n: 1, label: 'Select Customer', icon: User },
                    { n: 2, label: 'Select Orders', icon: ShoppingCart },
                    { n: 3, label: 'Add Items & Submit', icon: Package },
                ].map((s, idx) => {
                    const done = step > s.n;
                    const active = step === s.n;
                    const Icon = s.icon;
                    return (
                        <div key={s.n} className="flex items-center flex-1">
                            <div className="flex items-center gap-2 flex-1">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                                    done ? 'bg-green-500 text-white' : active ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'
                                }`}>
                                    {done ? <CheckCircle2 size={14} /> : s.n}
                                </div>
                                <div>
                                    <p className={`text-xs font-semibold ${active ? 'text-primary-700' : done ? 'text-green-600' : 'text-gray-400'}`}>
                                        Step {s.n}
                                    </p>
                                    <p className={`text-[11px] ${active ? 'text-gray-700' : 'text-gray-400'}`}>{s.label}</p>
                                </div>
                            </div>
                            {idx < 2 && <ChevronRight size={14} className="text-gray-300 mx-2 flex-shrink-0" />}
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">

                    {/* ── STEP 1: Customer ── */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'}`}>1</div>
                            <h3 className="text-sm font-semibold text-gray-700">Select Customer</h3>
                        </div>
                        <Select
                            label="Customer"
                            required
                            placeholder="Choose the customer who is returning goods..."
                            options={customerOptions}
                            value={customerId}
                            onChange={(e) => {
                                setCustomerId(e.target.value);
                                setSelectedOrderIds([]);
                                setItems([]);
                            }}
                        />
                    </Card>

                    {/* ── STEP 2: Orders ── */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'}`}>2</div>
                            <h3 className="text-sm font-semibold text-gray-700">Select Source Orders</h3>
                            <span className="text-xs text-gray-400 ml-1">— tick the orders the customer is returning from</span>
                        </div>

                        {!customerId && (
                            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-gray-400">
                                <AlertCircle size={18} />
                                <p className="text-sm">Select a customer in Step 1 first to see their eligible orders.</p>
                            </div>
                        )}

                        {customerId && ordersLoading && (
                            <div className="text-sm text-gray-400 py-4 text-center">Loading orders...</div>
                        )}

                        {customerId && !ordersLoading && orders.length === 0 && (
                            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
                                <PackageX size={18} />
                                <div>
                                    <p className="text-sm font-medium">No eligible orders found</p>
                                    <p className="text-xs text-amber-600">Only delivered, invoiced, or completed orders can be returned.</p>
                                </div>
                            </div>
                        )}

                        {customerId && !ordersLoading && orders.length > 0 && (
                            <div className="space-y-2 max-h-56 overflow-y-auto">
                                {orders.map((o) => {
                                    const checked = selectedOrderIds.includes(o._id);
                                    const itemCount = o.items?.length || 0;
                                    return (
                                        <label
                                            key={o._id}
                                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                                                checked
                                                    ? 'border-primary-400 bg-primary-50'
                                                    : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 accent-primary-600"
                                                checked={checked}
                                                onChange={() => toggleOrder(o._id)}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm font-semibold text-gray-800">{o.orderNumber}</span>
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                                        o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                                        o.status === 'invoiced'  ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-600'
                                                    }`}>
                                                        {o.status}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-0.5">{itemCount} item{itemCount !== 1 ? 's' : ''} · {new Date(o.orderDate).toLocaleDateString('en-LK')}</p>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-700">{fmt(o.grandTotal)}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    {/* ── STEP 3: Items ── */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-400'}`}>3</div>
                            <h3 className="text-sm font-semibold text-gray-700">Add Items to Return</h3>
                            {items.length > 0 && (
                                <span className="ml-auto text-xs bg-primary-100 text-primary-700 font-semibold px-2 py-0.5 rounded-full">
                                    {items.length} item{items.length !== 1 ? 's' : ''} added
                                </span>
                            )}
                        </div>

                        {/* No orders selected yet */}
                        {selectedOrderIds.length === 0 && (
                            <div className="flex items-center gap-3 p-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-gray-400">
                                <AlertCircle size={18} />
                                <p className="text-sm">Tick at least one order in Step 2 to see its items here.</p>
                            </div>
                        )}

                        {/* Available items picker */}
                        {unpickedItems.length > 0 && (
                            <div className="mb-5">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                    Available items — click + to add
                                </p>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {unpickedItems.map((ai, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between gap-3 px-3 py-2.5 border border-gray-200 rounded-lg bg-white hover:border-primary-300 hover:bg-primary-50 transition-colors group"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{ai.productName}</p>
                                                <p className="text-xs text-gray-400">
                                                    {ai.productCode} · {ai.orderNumber}
                                                    {ai.alreadyReturnedQuantity > 0 && (
                                                        <span className="ml-2 text-amber-600">
                                                            ({ai.alreadyReturnedQuantity} already returned)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                                    Max: {ai.maxQty} {ai.unitOfMeasure || ''}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => addItem(ai)}
                                                    className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors shadow-sm"
                                                    title="Add this item to the return"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All items picked */}
                        {selectedOrderIds.length > 0 && unpickedItems.length === 0 && availableItems.length > 0 && (
                            <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-4">
                                <CheckCircle2 size={15} />
                                All available items have been added.
                            </div>
                        )}

                        {/* Added items list */}
                        {items.length > 0 && (
                            <div>
                                {items.length > 0 && unpickedItems.length > 0 && (
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                        Added to return
                                    </p>
                                )}
                                <div className="space-y-3">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                                            {/* Item header */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <p className="font-semibold text-sm text-gray-800">{item.productName}</p>
                                                    <p className="text-xs text-gray-400 font-mono mt-0.5">{item.productCode}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1 rounded transition-colors"
                                                    title="Remove item"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Qty info bar */}
                                            <div className="flex items-center gap-3 text-xs mb-3">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                                    Ordered: {item.orderedQuantity}
                                                </span>
                                                {item.alreadyReturnedQuantity > 0 && (
                                                    <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                                        Returned: {item.alreadyReturnedQuantity}
                                                    </span>
                                                )}
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                                                    Returnable: {item.maxQty}
                                                </span>
                                            </div>

                                            {/* Inputs */}
                                            <div className="grid grid-cols-3 gap-3 mb-3">
                                                <div>
                                                    <Input
                                                        label={`Qty to Return (max ${item.maxQty})`}
                                                        type="number"
                                                        step="1"
                                                        min="1"
                                                        max={item.maxQty}
                                                        value={item.quantityReturned}
                                                        onChange={(e) => {
                                                            const val = Math.min(+e.target.value, item.maxQty);
                                                            updateItem(idx, 'quantityReturned', val);
                                                        }}
                                                    />
                                                    {+item.quantityReturned > item.maxQty && (
                                                        <p className="text-xs text-red-500 mt-1">Exceeds max returnable qty</p>
                                                    )}
                                                </div>
                                                <Input
                                                    label="Unit Price (LKR)"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                                                />
                                                <Input
                                                    label="Restock Fee %"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={item.restockingFeePercent}
                                                    onChange={(e) => updateItem(idx, 'restockingFeePercent', e.target.value)}
                                                />
                                            </div>

                                            <Select
                                                label="Return Reason"
                                                options={reasonOptions}
                                                value={item.reason}
                                                onChange={(e) => updateItem(idx, 'reason', e.target.value)}
                                            />
                                            <div className="mt-2">
                                                <Textarea
                                                    label="Additional details (optional)"
                                                    rows={2}
                                                    value={item.reasonDescription}
                                                    onChange={(e) => updateItem(idx, 'reasonDescription', e.target.value)}
                                                />
                                            </div>

                                            <label className="flex items-center gap-2 text-sm mt-3 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 accent-primary-600"
                                                    checked={item.refundable}
                                                    onChange={(e) => updateItem(idx, 'refundable', e.target.checked)}
                                                />
                                                <span className={item.refundable ? 'text-green-700 font-medium' : 'text-gray-500'}>
                                                    {item.refundable ? '✓ Refundable' : 'Non-refundable'}
                                                </span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* No items added yet empty state */}
                        {items.length === 0 && selectedOrderIds.length > 0 && availableItems.length > 0 && (
                            <div className="text-center py-6 text-gray-400">
                                <Package size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm">Click the <span className="font-semibold text-primary-600">+ button</span> next to an item above to add it to the return.</p>
                            </div>
                        )}
                    </Card>

                    {/* Notes */}
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Additional Notes</h3>
                        <div className="space-y-3">
                            <Textarea label="Customer Notes (visible to customer)" rows={2} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} />
                            <Textarea label="Internal Notes (staff only)" rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
                        </div>
                    </Card>
                </div>

                {/* ── Summary Panel ── */}
                <div>
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold mb-4 text-gray-700">Return Summary</h3>

                        {items.length === 0 ? (
                            <div className="text-center py-6 text-gray-300">
                                <PackageX size={32} className="mx-auto mb-2" />
                                <p className="text-xs">No items added yet</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1 mb-4">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-xs py-1 border-b border-gray-100">
                                            <span className="text-gray-600 truncate mr-2">{item.productName}</span>
                                            <span className="font-medium flex-shrink-0">
                                                {item.quantityReturned} × {fmt(item.unitPrice)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Return Value</span>
                                        <span className="font-medium">{fmt(totals.value)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Restocking Fees</span>
                                        <span className="text-red-600">-{fmt(totals.restocking)}</span>
                                    </div>
                                    <div className="flex justify-between pt-3 border-t font-semibold">
                                        <span>Net Refund</span>
                                        <span className="text-primary-600">{fmt(totals.refund)}</span>
                                    </div>
                                </div>
                            </>
                        )}

                        <Button
                            variant="primary"
                            fullWidth
                            className="mt-5"
                            onClick={submit}
                            loading={createMutation.isPending}
                            disabled={!customerId || items.length === 0}
                        >
                            <Save size={16} className="mr-1.5" /> Create RMA
                        </Button>
                        <p className="text-xs text-gray-400 text-center mt-2">
                            Saved as draft. Approve it to start processing.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}