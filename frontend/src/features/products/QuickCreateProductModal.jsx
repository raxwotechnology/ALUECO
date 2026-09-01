import { useState } from 'react';
import toast from 'react-hot-toast';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCreateProduct } from './useProducts';
import { useCategories, useUoms } from './useProducts';

const DEFAULT_UOMS = [
    { value: 'pc', label: 'Piece (pc)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'bar', label: 'Bar - Extrusion (bar)' },
    { value: 'm', label: 'Meter (m)' },
    { value: 'ft', label: 'Foot / Feet (ft)' },
    { value: 'sqm', label: 'Square Meter (sqm)' },
    { value: 'sqft', label: 'Square Feet (sqft)' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'g', label: 'Gram (g)' },
    { value: 'box', label: 'Box (box)' },
    { value: 'ctn', label: 'Carton (ctn)' },
    { value: 'bundle', label: 'Bundle (bundle)' },
    { value: 'roll', label: 'Roll (roll)' },
    { value: 'set', label: 'Set (set)' },
    { value: 'pr', label: 'Pair (pr)' },
    { value: 'pack', label: 'Pack (pack)' },
    { value: 'sheet', label: 'Sheet (sheet)' },
    { value: 'L', label: 'Liter (L)' },
    { value: 'ml', label: 'Milliliter (ml)' },
    { value: 'hr', label: 'Hour (hr)' },
];

/**
 * Quick modal for creating a product on the fly during PO/SO creation.
 * Captures only essentials. Full edit later.
 */
export default function QuickCreateProductModal({
    isOpen, onClose, onCreated,
    defaultProductType = 'finished_good', // 'raw_material' for PO, 'finished_good' for SO
}) {
    const [form, setForm] = useState({
        name: '',
        productType: defaultProductType,
        categoryId: '',
        unitOfMeasure: 'pcs',
        basePrice: 0,
        purchasePrice: 0,
        canBeSold: defaultProductType !== 'raw_material',
        canBePurchased: true,
    });

    const createMutation = useCreateProduct();
    const { data: categoriesData } = useCategories({ isActive: 'true' });
    const { data: uomsData } = useUoms();

    const categoryOptions = (categoriesData?.data || []).map((c) => ({ value: c._id, label: c.name }));
    const fetchedUoms = (uomsData?.data || []).map((u) => ({
        value: u.symbol || u.code || u.name,
        label: `${u.name} (${u.symbol || u.code || u.name})`
    }));
    const uomOptions = fetchedUoms.length > 0 ? fetchedUoms : DEFAULT_UOMS;

    const submit = async () => {
        if (!form.name) { toast.error('Product name required'); return; }

        try {
            const result = await createMutation.mutateAsync({
                name: form.name,
                productType: form.productType,
                categoryId: form.categoryId || undefined,
                unitOfMeasure: form.unitOfMeasure,
                basePrice: +form.basePrice || 0,
                costs: {
                    lastPurchaseCost: +form.purchasePrice || 0,
                    averageCost: +form.purchasePrice || 0,
                },
                canBeSold: form.canBeSold,
                canBePurchased: form.canBePurchased,
                canBeManufactured: false,
                tax: { taxable: true, taxRate: 18 },
                status: 'active',
            });

            setForm({
                name: '', productType: defaultProductType, categoryId: '',
                unitOfMeasure: 'pcs', basePrice: 0, purchasePrice: 0,
                canBeSold: defaultProductType !== 'raw_material', canBePurchased: true,
            });

            toast.success('Product created — complete pricing/stock from Products page');
            onCreated?.(result.data);
            onClose();
        } catch { }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quick Create Product" size="md">
            <div className="p-6 space-y-4">
                <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded">
                    Capture essentials now. You can add full pricing tiers, stock levels, BOM, and images from the Products page.
                </p>

                <Input label="Product Name" required placeholder="e.g., Sugar 1kg"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />

                <div className="grid grid-cols-2 gap-3">
                    <Select label="Type"
                        options={[
                            { value: 'finished_good', label: 'Finished Good (sellable)' },
                            { value: 'raw_material', label: 'Raw Material' },
                            { value: 'packaging', label: 'Packaging' },
                            { value: 'consumable', label: 'Consumable' },
                            { value: 'service', label: 'Service' },
                        ]}
                        value={form.productType}
                        onChange={(e) => {
                            const v = e.target.value;
                            setForm((f) => ({
                                ...f, productType: v,
                                canBeSold: v !== 'raw_material',
                            }));
                        }} />
                    <Select label="Unit of Measure" required options={uomOptions}
                        value={form.unitOfMeasure}
                        onChange={(e) => setForm((f) => ({ ...f, unitOfMeasure: e.target.value }))} />
                </div>

                <Select label="Category" placeholder="Uncategorized" options={categoryOptions}
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} />

                <div className="grid grid-cols-2 gap-3">
                    <Input label="Selling Price (LKR)" type="number" step="0.01" min="0"
                        value={form.basePrice}
                        onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} />
                    <Input label="Purchase Cost (LKR)" type="number" step="0.01" min="0"
                        value={form.purchasePrice}
                        onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))} />
                </div>

                <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={form.canBeSold}
                            onChange={(e) => setForm((f) => ({ ...f, canBeSold: e.target.checked }))} />
                        Can be sold
                    </label>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={form.canBePurchased}
                            onChange={(e) => setForm((f) => ({ ...f, canBePurchased: e.target.checked }))} />
                        Can be purchased
                    </label>
                </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={submit} loading={createMutation.isPending}>
                    Create Product
                </Button>
            </div>
        </Modal>
    );
}