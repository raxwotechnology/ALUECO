import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save, PenLine } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import ProductAutocompleteSelect from '../components/ui/ProductAutocompleteSelect';

import { suppliersApi } from '../features/suppliers/suppliersApi';
import { productsApi } from '../features/products/productsApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useCreatePurchaseOrder } from '../features/purchaseOrders/usePurchaseOrders';

import { PackagePlus, Building2 } from 'lucide-react';
import QuickCreateProductModal from '../features/products/QuickCreateProductModal';
import QuickCreateSupplierModal from '../features/suppliers/QuickCreateSupplierModal'; // we'll create this

export default function PurchaseOrderFormPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const preSupplierId = params.get('supplierId');
    const isSupplierRequest = !!preSupplierId;
    const createMutation = useCreatePurchaseOrder();

    const [supplierId, setSupplierId] = useState(preSupplierId || '');
    const [warehouseId, setWarehouseId] = useState('');
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
    const [shippingCost, setShippingCost] = useState(0);
    const [otherCharges, setOtherCharges] = useState(0);
    const [shippingTerms, setShippingTerms] = useState('');
    const [notes, setNotes] = useState('');
    const [internalNotes, setInternalNotes] = useState('');
    const [items, setItems] = useState([]);

    const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
    const [quickProductLineIdx, setQuickProductLineIdx] = useState(null);
    const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);

    const { data: suppliersData } = useQuery({
        queryKey: ['suppliers', 'active'],
        queryFn: () => suppliersApi.list({ status: 'active', limit: 500 }),
    });
    const { data: productsData } = useQuery({
        queryKey: ['products', 'active'],
        queryFn: () => productsApi.list({ status: 'active', limit: 500 }),
        enabled: !isSupplierRequest,
    });
    const { data: warehousesData } = useWarehouses({ isActive: true });

    const suppliers = suppliersData?.data || [];
    const products = productsData?.data || [];
    const warehouses = warehousesData?.data || [];

    const selectedSupplier = useMemo(() => suppliers.find((s) => s._id === supplierId), [supplierId, suppliers]);

    const supplierOptions = suppliers.map((s) => ({ value: s._id, label: `${s.displayName} (${s.supplierCode})` }));
    const productOptions = products.map((p) => ({ value: p._id, label: `${p.name} — ${p.productCode}` }));
    const warehouseOptions = warehouses.map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseCode})` }));

    const emptyCatalogItem = () => ({
        itemType: 'catalog',
        productId: '',
        productName: '',
        unitOfMeasure: '',
        orderedQuantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxRate: 18,
        taxable: true,
    });

    const emptyCustomItem = () => ({
        itemType: 'custom',
        productId: '',
        productName: '',
        unitOfMeasure: 'pcs',
        orderedQuantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxRate: 18,
        taxable: true,
    });

    const addItem = () => setItems([...items, emptyCatalogItem()]);
    const addCustomItem = () => setItems([...items, emptyCustomItem()]);
    const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
    const updateItem = (idx, field, value) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [field]: value };
        if (field === 'itemType') {
            if (value === 'catalog') {
                newItems[idx].productName = '';
                newItems[idx].unitOfMeasure = '';
            } else {
                newItems[idx].productId = '';
                newItems[idx].unitOfMeasure = newItems[idx].unitOfMeasure || 'pcs';
            }
        }
        if (field === 'productId' && value) {
            const p = products.find((pr) => pr._id === value);
            if (p) {
                newItems[idx].unitPrice = p.costs?.lastPurchaseCost || 0;
                newItems[idx].taxRate = p.tax?.taxRate || 0;
                newItems[idx].taxable = p.tax?.taxable ?? true;
            }
        }
        setItems(newItems);
    };

    useEffect(() => {
        if (isSupplierRequest) {
            setItems((prev) => (prev.length === 0 ? [emptyCustomItem()] : prev));
        }
    }, [isSupplierRequest]);

    const isCustomItem = (item) => isSupplierRequest || item.itemType === 'custom' || (!item.productId && !!item.productName?.trim());

    const isItemValid = (item) => {
        const qty = Number(item.orderedQuantity);
        if (!qty || qty <= 0) return false;
        if (isCustomItem(item)) return !!item.productName?.trim();
        return !!item.productId;
    };

    const buildItemPayload = (item) => {
        const base = {
            orderedQuantity: +item.orderedQuantity,
            unitPrice: +item.unitPrice,
            discountPercent: +item.discountPercent || 0,
            taxRate: +item.taxRate || 0,
            taxable: item.taxable,
        };
        if (isCustomItem(item)) {
            return {
                ...base,
                productName: item.productName.trim(),
                unitOfMeasure: item.unitOfMeasure?.trim() || 'pcs',
            };
        }
        return { ...base, productId: item.productId };
    };

    const totals = useMemo(() => {
        let sub = 0, disc = 0, tax = 0;
        items.forEach((i) => {
            const qty = +i.orderedQuantity || 0;
            const price = +i.unitPrice || 0;
            const lSub = qty * price;
            const lDisc = lSub * (+i.discountPercent || 0) / 100;
            const taxable = i.taxable ? (lSub - lDisc) : 0;
            const lTax = taxable * (+i.taxRate || 0) / 100;
            sub += lSub; disc += lDisc; tax += lTax;
        });
        const grand = sub - disc + tax + (+shippingCost || 0) + (+otherCharges || 0);
        return { sub: +sub.toFixed(2), disc: +disc.toFixed(2), tax: +tax.toFixed(2), grand: +grand.toFixed(2) };
    }, [items, shippingCost, otherCharges]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const submit = async (asDraft) => {
        if (!supplierId) { toast.error('Select a supplier'); return; }
        if (!warehouseId) { toast.error('Select a delivery warehouse'); return; }
        if (items.length === 0) { toast.error('Add at least one item'); return; }
        if (items.some((i) => !isItemValid(i))) {
            toast.error('Each item needs a product (from catalog or typed manually) and quantity');
            return;
        }

        try {
            const result = await createMutation.mutateAsync({
                supplierId,
                deliverTo: { warehouseId },
                expectedDeliveryDate: expectedDeliveryDate || undefined,
                shippingTerms: shippingTerms || undefined,
                shippingCost: +shippingCost || 0,
                otherCharges: +otherCharges || 0,
                items: items.map(buildItemPayload),
                notes: notes || undefined,
                internalNotes: internalNotes || undefined,
                status: asDraft ? 'draft' : 'approved',
            });
            navigate(`/purchase-orders/${result.data._id}`);
        } catch { }
    };

    return (
        <div>
            <PageHeader
                title={selectedSupplier ? `Request Order — ${selectedSupplier.displayName}` : 'New Purchase Order'}
                description={isSupplierRequest ? 'Type the items you need from this supplier' : 'Order stock from a supplier'}
                actions={<Button variant="outline" onClick={() => navigate('/purchase-orders')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>}
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Supplier & Delivery</h3>
                        <div className="space-y-4">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <Select label="Supplier" required placeholder="Select supplier..."
                                        options={supplierOptions} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}
                                        disabled={!!preSupplierId} />
                                </div>

                                <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => setIsQuickSupplierOpen(true)}
                                    title="Quick add new supplier"
                                    disabled={!!preSupplierId}>
                                    <Building2 size={14} />
                                </Button>
                            </div>
                            {selectedSupplier && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                    <p><span className="text-gray-500">Terms:</span> {selectedSupplier.paymentTerms?.type?.toUpperCase()}
                                        {selectedSupplier.paymentTerms?.type === 'credit' && ` (${selectedSupplier.paymentTerms.creditDays}d)`}</p>
                                    <p><span className="text-gray-500">Lead time:</span> {selectedSupplier.averageLeadTimeDays || '—'} days</p>
                                </div>
                            )}

                            <Select label="Deliver To Warehouse" required
                                options={warehouseOptions} value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Expected Delivery Date" type="date"
                                    value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
                                <Select label="Shipping Terms" placeholder="Select..."
                                    options={[
                                        { value: 'FOB', label: 'FOB (Free on Board)' },
                                        { value: 'CIF', label: 'CIF (Cost Insurance Freight)' },
                                        { value: 'EXW', label: 'EXW (Ex Works)' },
                                        { value: 'DDP', label: 'DDP (Delivered Duty Paid)' },
                                    ]}
                                    value={shippingTerms} onChange={(e) => setShippingTerms(e.target.value)} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">Items</h3>
                            <div className="flex gap-2">
                                {!isSupplierRequest && (
                                    <Button type="button" variant="outline" size="sm" onClick={addItem}>
                                        <Plus size={14} className="mr-1" /> From Catalog
                                    </Button>
                                )}
                                <Button type="button" variant="outline" size="sm" onClick={addCustomItem}>
                                    <PenLine size={14} className="mr-1" /> {isSupplierRequest ? 'Add Item' : 'Custom Item'}
                                </Button>
                            </div>
                        </div>
                        {items.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">
                                {isSupplierRequest
                                    ? 'Click "Add Item" and type the product names you need from this supplier.'
                                    : 'No items yet. Add from catalog or type a custom product name.'}
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {items.map((item, idx) => {
                                    const lSub = (+item.orderedQuantity || 0) * (+item.unitPrice || 0);
                                    const lDisc = lSub * (+item.discountPercent || 0) / 100;
                                    const taxable = item.taxable ? (lSub - lDisc) : 0;
                                    const lTotal = taxable + (taxable * (+item.taxRate || 0) / 100);
                                    const isCustom = isSupplierRequest || item.itemType === 'custom';

                                    return (
                                        <div key={idx} className={`border rounded-lg p-3 ${isCustom ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'}`}>
                                            <div className="flex items-start gap-2 mb-2">
                                                <span className="text-xs text-gray-500 mt-2 w-6">{idx + 1}</span>
                                                <div className="flex-1 space-y-2">
                                                    {!isSupplierRequest && (
                                                        <div className="flex gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateItem(idx, 'itemType', 'catalog')}
                                                                className={`px-2 py-1 text-xs rounded ${!isCustom ? 'bg-primary-100 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                                                            >
                                                                From Catalog
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateItem(idx, 'itemType', 'custom')}
                                                                className={`px-2 py-1 text-xs rounded ${isCustom ? 'bg-amber-100 text-amber-800 font-medium' : 'text-gray-500 hover:bg-gray-100'}`}
                                                            >
                                                                Custom / Manual
                                                            </button>
                                                        </div>
                                                    )}
                                                    {isCustom ? (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <Input
                                                                label="Product Name"
                                                                required
                                                                placeholder="Type product name..."
                                                                value={item.productName}
                                                                onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                                                            />
                                                            <Input
                                                                label="Unit"
                                                                placeholder="e.g. pcs, kg, box"
                                                                value={item.unitOfMeasure}
                                                                onChange={(e) => updateItem(idx, 'unitOfMeasure', e.target.value)}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-2 items-end">
                                                            <div className="flex-1">
                                                                <ProductAutocompleteSelect
                                                                    placeholder="Search product by name or code..."
                                                                    products={products}
                                                                    value={item.productId}
                                                                    onChange={(productId, product) => {
                                                                        updateItem(idx, 'productId', productId);
                                                                        if (product) {
                                                                            updateItem(idx, 'unitPrice', product.costs?.lastPurchaseCost || 0);
                                                                            updateItem(idx, 'taxRate', product.tax?.taxRate || 0);
                                                                            updateItem(idx, 'taxable', product.tax?.taxable ?? true);
                                                                        }
                                                                    }}
                                                                    productType="raw_material"
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                type="button"
                                                                onClick={() => {
                                                                    setQuickProductLineIdx(idx);
                                                                    setIsQuickProductOpen(true);
                                                                }}
                                                                title="Quick add new product">
                                                                <PackagePlus size={14} />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                                <button type="button" onClick={() => removeItem(idx)} className="text-red-600 hover:bg-red-50 p-2 rounded mt-1">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-5 gap-2">
                                                <Input label="Qty" type="number" step="0.01" min="0.01"
                                                    value={item.orderedQuantity} onChange={(e) => updateItem(idx, 'orderedQuantity', e.target.value)} />
                                                <Input label="Unit Price" type="number" step="0.01" min="0"
                                                    value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                                                <Input label="Disc %" type="number" step="0.01" min="0" max="100"
                                                    value={item.discountPercent} onChange={(e) => updateItem(idx, 'discountPercent', e.target.value)} />
                                                <Input label="Tax %" type="number" step="0.01" min="0"
                                                    value={item.taxRate} onChange={(e) => updateItem(idx, 'taxRate', e.target.value)} />
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Line Total</label>
                                                    <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium">{fmt(lTotal)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Notes</h3>
                        <div className="space-y-4">
                            <Textarea label="Notes to Supplier" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                            <Textarea label="Internal Notes" rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
                        </div>
                    </Card>
                </div >

                <div>
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{fmt(totals.sub)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="text-red-600">-{fmt(totals.disc)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>{fmt(totals.tax)}</span></div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-600">Shipping</span>
                                <input type="number" step="0.01" min="0" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)}
                                    className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-gray-600">Other Charges</span>
                                <input type="number" step="0.01" min="0" value={otherCharges} onChange={(e) => setOtherCharges(e.target.value)}
                                    className="w-28 px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                            </div>
                            <div className="pt-3 border-t flex justify-between">
                                <span className="font-semibold">Grand Total</span>
                                <span className="font-bold text-lg text-primary-600">{fmt(totals.grand)}</span>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2">
                            <Button variant="primary" fullWidth onClick={() => submit(false)} loading={createMutation.isPending}
                                disabled={!supplierId || !warehouseId || items.length === 0 || items.some((i) => !isItemValid(i))}>
                                <Save size={16} className="mr-1.5" /> Create & Approve
                            </Button>
                            <Button variant="outline" fullWidth onClick={() => submit(true)} loading={createMutation.isPending}
                                disabled={!supplierId || !warehouseId || items.length === 0 || items.some((i) => !isItemValid(i))}>
                                Save as Draft
                            </Button>
                        </div>
                    </Card>
                </div>
            </div >
            <QuickCreateSupplierModal
                isOpen={isQuickSupplierOpen}
                onClose={() => setIsQuickSupplierOpen(false)}
                onCreated={(newSupplier) => setSupplierId(newSupplier._id)}
            />

            <QuickCreateProductModal
                isOpen={isQuickProductOpen}
                onClose={() => { setIsQuickProductOpen(false); setQuickProductLineIdx(null); }}
                defaultProductType="raw_material"
                onCreated={(newProduct) => {
                    if (quickProductLineIdx !== null) {
                        setItems((prev) => {
                            const next = [...prev];
                            const idx = quickProductLineIdx;
                            next[idx] = {
                                ...next[idx],
                                itemType: 'catalog',
                                productId: newProduct._id,
                                productName: '',
                                unitPrice: newProduct.costs?.lastPurchaseCost || 0,
                                taxRate: newProduct.tax?.taxRate || 0,
                                taxable: newProduct.tax?.taxable ?? true,
                            };
                            return next;
                        });
                    }
                    setQuickProductLineIdx(null);
                }}
            />
        </div >
    );
}