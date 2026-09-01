import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Plus, Trash2, ArrowLeft, Save, AlertTriangle,
    UserPlus,
} from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import { customersApi } from '../features/customers/customersApi';
import { productsApi } from '../features/products/productsApi';
import { stockApi } from '../features/stock/stockApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useCreateSalesOrder } from '../features/salesOrders/useSalesOrders';
import QuickCreateCustomerModal from '../features/customers/QuickCreateCustomerModal';

export default function SalesOrderFormPage() {
    const navigate = useNavigate();
    const createOrder = useCreateSalesOrder();

    // Form state
    const [customerId, setCustomerId] = useState('');
    const [sourceWarehouseId, setSourceWarehouseId] = useState('');
    const [shippingAddressLabel, setShippingAddressLabel] = useState('');
    const [priority, setPriority] = useState('normal');
    const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
    const [customerNotes, setCustomerNotes] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [items, setItems] = useState([]);
    const [shippingCost, setShippingCost] = useState(0);
    const [orderDiscountPercent, setOrderDiscountPercent] = useState(0);

    // Quick-create modals
    const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);

    // Data
    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 500 }),
    });
    const { data: productsData } = useQuery({
        queryKey: ['products', 'active'],
        queryFn: () => productsApi.list({ status: 'active', limit: 500 }),
    });
    const { data: warehousesData } = useWarehouses({ isActive: true });

    const customers = customersData?.data || [];
    const products = (productsData?.data || []).filter(
        (p) => p.canBeSold !== false
    );
    const warehouses = warehousesData?.data || [];

    // Set default warehouse on load
    useEffect(() => {
        if (!sourceWarehouseId && warehouses.length > 0) {
            const def = warehouses.find((w) => w.isDefault) || warehouses[0];
            if (def) setSourceWarehouseId(def._id);
        }
    }, [warehouses, sourceWarehouseId]);

    const selectedWarehouse = warehouses.find((w) => w._id === sourceWarehouseId);

    // Fetch stock for the selected warehouse
    const { data: stockData } = useQuery({
        queryKey: ['stock', 'for-orders', sourceWarehouseId],
        queryFn: () => stockApi.list({ warehouseId: sourceWarehouseId, limit: 500 }),
        enabled: !!sourceWarehouseId,
    });
    const stockItems = stockData?.data || [];

    // Build stock map (productId -> { onHand, reserved, available })
    const stockMap = useMemo(() => {
        const map = new Map();
        stockItems.forEach((s) => {
            const pid = s.productId?._id || s.productId;
            const existing = map.get(pid) || { onHand: 0, reserved: 0 };
            existing.onHand += s.quantities?.onHand || 0;
            existing.reserved += s.quantities?.reserved || 0;
            existing.available = Math.max(0, existing.onHand - existing.reserved);
            map.set(pid, existing);
        });
        return map;
    }, [stockItems]);

    const selectedCustomer = useMemo(
        () => customers.find((c) => c._id === customerId),
        [customerId, customers]
    );

    const customerOptions = customers.map((c) => ({
        value: c._id,
        label: `${c.displayName} (${c.customerCode})`,
    }));

    const warehouseOptions = warehouses.map((w) => ({
        value: w._id,
        label: `${w.name} (${w.warehouseCode})${w.isDefault ? ' · Default' : ''}`,
    }));

    // Product options with live stock from selected warehouse
    const productOptions = products
        .filter((p) => p.canBeSold !== false)
        .map((p) => {
            const stock = stockMap.get(p._id);
            const available = stock?.available || 0;
            const outOfStock = available <= 0;
            const lowStock = available > 0 && available <= (p.stockLevels?.reorderLevel || 0);
            return {
                value: p._id,
                label: `${p.name} · ${p.productCode} · ${outOfStock
                    ? '⚠ Out of stock'
                    : lowStock
                        ? `⚠ Only ${available} left`
                        : `✓ ${available} available`
                    } · LKR ${p.basePrice || p.costs?.lastPurchaseCost || p.costs?.averageCost || 0}`,
                disabled: outOfStock,
            };
        });

    const shippingAddressOptions = selectedCustomer?.shippingAddresses?.map((a) => ({
        value: a.label || `${a.city || ''}`,
        label: `${a.label || a.city || 'Unnamed'} — ${a.line1 || ''}`,
    })) || [];

    // Item handlers
    const addItem = () => {
        setItems([...items, {
            productId: '', orderedQuantity: 1, unitPrice: 0,
            discountPercent: 0, taxRate: 18, taxable: true,
        }]);
    };
    const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
    const updateItem = (idx, field, value) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [field]: value };

        if (field === 'productId' && value) {
            const p = products.find((pr) => pr._id === value);
            if (p) {
                let price = p.basePrice || p.costs?.lastPurchaseCost || p.costs?.averageCost || 0;
                if (selectedCustomer?.defaultDiscountPercent) {
                    price = price * (1 - selectedCustomer.defaultDiscountPercent / 100);
                }
                newItems[idx].unitPrice = +price.toFixed(2);
                newItems[idx].taxRate = p.tax?.taxRate || 0;
                newItems[idx].taxable = p.tax?.taxable ?? true;
            }
        }
        setItems(newItems);
    };

    // Totals calculation
    const totals = useMemo(() => {
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        items.forEach((item) => {
            const qty = +item.orderedQuantity || 0;
            const price = +item.unitPrice || 0;
            const dPct = +item.discountPercent || 0;
            const tRate = +item.taxRate || 0;

            const lineSub = qty * price;
            const lineDisc = lineSub * dPct / 100;
            const taxable = item.taxable ? (lineSub - lineDisc) : 0;
            const lineTax = taxable * tRate / 100;

            subtotal += lineSub;
            totalDiscount += lineDisc;
            totalTax += lineTax;
        });

        const orderDisc = (subtotal - totalDiscount) * (+orderDiscountPercent || 0) / 100;
        const grandTotal = subtotal - totalDiscount - orderDisc + totalTax + (+shippingCost || 0);

        return {
            subtotal: +subtotal.toFixed(2),
            totalDiscount: +totalDiscount.toFixed(2),
            orderLevelDiscount: +orderDisc.toFixed(2),
            totalTax: +totalTax.toFixed(2),
            grandTotal: +grandTotal.toFixed(2),
        };
    }, [items, orderDiscountPercent, shippingCost]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', {
        style: 'currency', currency: 'LKR', minimumFractionDigits: 2,
    }).format(n || 0);

    const handleSubmit = async (saveAsDraft = false) => {
        if (!customerId) { toast.error('Select a customer'); return; }
        if (!sourceWarehouseId) { toast.error('Select a warehouse'); return; }
        if (items.length === 0) { toast.error('Add at least one item'); return; }
        if (items.some((i) => !i.productId || !i.orderedQuantity)) {
            toast.error('All items must have a product and quantity');
            return;
        }

        // Client-side stock pre-check if approving (not draft)
        if (!saveAsDraft) {
            for (const item of items) {
                const stock = stockMap.get(item.productId);
                const available = stock?.available || 0;
                if (+item.orderedQuantity > available) {
                    const product = products.find((p) => p._id === item.productId);
                    toast.error(`Not enough stock for ${product?.name}. Available: ${available}, requested: ${item.orderedQuantity}`);
                    return;
                }
            }
        }

        const payload = {
            customerId,
            sourceWarehouseId,
            source: 'direct',
            shippingAddressLabel: shippingAddressLabel || undefined,
            requestedDeliveryDate: requestedDeliveryDate || undefined,
            priority,
            items: items.map((i) => ({
                productId: i.productId,
                orderedQuantity: +i.orderedQuantity,
                unitPrice: +i.unitPrice,
                discountPercent: +i.discountPercent || 0,
                taxRate: +i.taxRate || 0,
                taxable: i.taxable,
            })),
            orderDiscount: orderDiscountPercent > 0
                ? { type: 'percentage', value: +orderDiscountPercent }
                : undefined,
            shippingCost: +shippingCost || 0,
            customerNotes: customerNotes || undefined,
            internalNotes: internalNotes || undefined,
            status: saveAsDraft ? 'draft' : 'approved',
        };

        try {
            const result = await createOrder.mutateAsync(payload);
            navigate(`/sales-orders/${result.data._id}`);
        } catch { }
    };

    return (
        <div>
            <PageHeader
                title="New Sales Order"
                description={selectedWarehouse
                    ? `Fulfilling from: ${selectedWarehouse.name}`
                    : 'Select a warehouse to begin'}
                actions={
                    <Button variant="outline" onClick={() => navigate('/sales-orders')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back
                    </Button>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">

                    {/* Customer & Delivery */}
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Customer & Delivery</h3>
                        <div className="space-y-4">

                            {/* Customer with quick-create button */}
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <Select
                                        label="Customer" required
                                        placeholder="Select a customer..."
                                        options={customerOptions}
                                        value={customerId}
                                        onChange={(e) => { setCustomerId(e.target.value); setShippingAddressLabel(''); }}
                                    />
                                </div>
                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => setIsQuickCustomerOpen(true)}
                                    title="Quick add new customer">
                                    <UserPlus size={14} />
                                </Button>
                            </div>

                            {/* Warehouse picker */}
                            <div>
                                <Select
                                    label="Source Warehouse" required
                                    placeholder="Select warehouse..."
                                    options={warehouseOptions}
                                    value={sourceWarehouseId}
                                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Stock levels and availability reflect the selected warehouse.
                                </p>
                            </div>

                            {selectedCustomer && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                                    <p>
                                        <span className="text-gray-500">Tax Reg:</span>{' '}
                                        {selectedCustomer.taxRegistrationNumber || '—'}
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Terms:</span>{' '}
                                        {selectedCustomer.paymentTerms?.type?.toUpperCase()}
                                        {selectedCustomer.paymentTerms?.type === 'credit'
                                            && ` (${selectedCustomer.paymentTerms.creditDays}d)`}
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Available credit:</span>{' '}
                                        {fmt(selectedCustomer.creditStatus?.availableCredit || 0)}
                                    </p>
                                    <p>
                                        <span className="text-gray-500">Default discount:</span>{' '}
                                        {selectedCustomer.defaultDiscountPercent || 0}%
                                    </p>
                                    {selectedCustomer.creditStatus?.onCreditHold && (
                                        <p className="text-red-600 font-medium">⚠ Customer is on credit hold</p>
                                    )}
                                </div>
                            )}

                            {shippingAddressOptions.length > 0 && (
                                <Select
                                    label="Ship To"
                                    placeholder="Default shipping address"
                                    options={shippingAddressOptions}
                                    value={shippingAddressLabel}
                                    onChange={(e) => setShippingAddressLabel(e.target.value)}
                                />
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Requested Delivery Date" type="date"
                                    value={requestedDeliveryDate}
                                    onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                                />
                                <Select
                                    label="Priority"
                                    options={[
                                        { value: 'low', label: 'Low' },
                                        { value: 'normal', label: 'Normal' },
                                        { value: 'high', label: 'High' },
                                        { value: 'urgent', label: 'Urgent' },
                                    ]}
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Line Items */}
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                <Plus size={14} className="mr-1" /> Add Item
                            </Button>
                        </div>

                        {!sourceWarehouseId && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex gap-2">
                                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-800">
                                    Select a warehouse first to see stock availability.
                                </p>
                            </div>
                        )}

                        {items.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                No items added. Click "Add Item" to start.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item, idx) => {
                                    const qty = +item.orderedQuantity || 0;
                                    const price = +item.unitPrice || 0;
                                    const lineSub = qty * price;
                                    const lineDisc = lineSub * (+item.discountPercent || 0) / 100;
                                    const taxable = item.taxable ? (lineSub - lineDisc) : 0;
                                    const lineTotal = taxable + (taxable * (+item.taxRate || 0) / 100);

                                    const stock = stockMap.get(item.productId);
                                    const available = stock?.available || 0;
                                    const overordering = item.productId && qty > available;

                                    return (
                                        <div key={idx}
                                            className={`border rounded-lg p-3 ${overordering ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                                            <div className="flex items-start gap-2 mb-2">
                                                <span className="text-xs text-gray-500 mt-2 w-6">{idx + 1}</span>

                                                {/* Product picker with quick-create button */}
                                                <div className="flex-1">
                                                    <div className="flex gap-2 items-end">
                                                        <div className="flex-1">
                                                            <Select
                                                                placeholder="Select product..."
                                                                options={productOptions}
                                                                value={item.productId}
                                                                onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>

                                                    {item.productId && stock && (
                                                        <div className="mt-1 flex gap-2 items-center text-xs">
                                                            <span className="text-gray-500">Stock:</span>
                                                            <Badge variant={available > 0 ? 'success' : 'danger'}>
                                                                {available} available
                                                            </Badge>
                                                            {stock.reserved > 0 && (
                                                                <span className="text-amber-600">
                                                                    ({stock.reserved} reserved for other orders)
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    type="button" onClick={() => removeItem(idx)}
                                                    className="text-red-600 hover:bg-red-50 p-2 rounded mt-1">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-5 gap-2">
                                                <div>
                                                    <Input
                                                        label="Qty" type="number" step="0.01" min="0.01"
                                                        value={item.orderedQuantity}
                                                        onChange={(e) => updateItem(idx, 'orderedQuantity', e.target.value)}
                                                        error={overordering ? `Max ${available}` : undefined}
                                                    />
                                                </div>
                                                <Input
                                                    label="Unit Price" type="number" step="0.01" min="0"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                                                />
                                                <Input
                                                    label="Disc %" type="number" step="0.01" min="0" max="100"
                                                    value={item.discountPercent}
                                                    onChange={(e) => updateItem(idx, 'discountPercent', e.target.value)}
                                                />
                                                <Input
                                                    label="Tax %" type="number" step="0.01" min="0"
                                                    value={item.taxRate}
                                                    onChange={(e) => updateItem(idx, 'taxRate', e.target.value)}
                                                />
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Line Total
                                                    </label>
                                                    <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium">
                                                        {fmt(lineTotal)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    {/* Notes */}
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Notes</h3>
                        <div className="space-y-4">
                            <Textarea
                                label="Customer Notes (visible on order)" rows={2}
                                value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)}
                            />
                            <Textarea
                                label="Internal Notes (not visible to customer)" rows={2}
                                value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)}
                            />
                        </div>
                    </Card>
                </div>

                {/* Order Summary sidebar */}
                <div className="space-y-6">
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Summary</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium">{fmt(totals.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Line Discounts</span>
                                <span className="text-red-600">-{fmt(totals.totalDiscount)}</span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                <label className="text-sm text-gray-600">Order Discount %</label>
                                <input
                                    type="number" step="0.01" min="0" max="100"
                                    value={orderDiscountPercent}
                                    onChange={(e) => setOrderDiscountPercent(e.target.value)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                />
                            </div>

                            {totals.orderLevelDiscount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Order Discount</span>
                                    <span className="text-red-600">-{fmt(totals.orderLevelDiscount)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Tax (VAT)</span>
                                <span>{fmt(totals.totalTax)}</span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                                <label className="text-sm text-gray-600">Shipping Cost</label>
                                <input
                                    type="number" step="0.01" min="0"
                                    value={shippingCost}
                                    onChange={(e) => setShippingCost(e.target.value)}
                                    className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                />
                            </div>

                            <div className="pt-3 border-t border-gray-200 flex justify-between">
                                <span className="font-semibold text-gray-900">Grand Total</span>
                                <span className="font-bold text-lg text-primary-600">{fmt(totals.grandTotal)}</span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2">
                            <Button
                                variant="primary" fullWidth
                                onClick={() => handleSubmit(false)}
                                loading={createOrder.isPending}
                                disabled={items.length === 0 || !customerId || !sourceWarehouseId}>
                                <Save size={16} className="mr-1.5" /> Create & Approve
                            </Button>
                            <Button
                                variant="outline" fullWidth
                                onClick={() => handleSubmit(true)}
                                loading={createOrder.isPending}
                                disabled={items.length === 0 || !customerId || !sourceWarehouseId}>
                                Save as Draft
                            </Button>
                            <p className="text-xs text-gray-500 text-center pt-2">
                                "Approve" reserves stock immediately. "Draft" doesn't.
                            </p>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Quick-create modals */}
            <QuickCreateCustomerModal
                isOpen={isQuickCustomerOpen}
                onClose={() => setIsQuickCustomerOpen(false)}
                onCreated={(newCustomer) => setCustomerId(newCustomer._id)}
            />
        </div>
    );
}