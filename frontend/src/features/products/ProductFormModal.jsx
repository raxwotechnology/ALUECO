import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { productFormSchema } from './productSchemas';
import { useCategories, useBrands, useUoms, useCreateProduct, useUpdateProduct } from './useProducts';
import { productsApi } from './productsApi';
import { suppliersApi } from '../suppliers/suppliersApi';
import { useQuery } from '@tanstack/react-query';

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

const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'pricing', label: 'Pricing & Tax' },
    { id: 'stock', label: 'Stock & Packaging' },
    { id: 'sales', label: 'Sales Config' },
];

export default function ProductFormModal({ isOpen, onClose, product = null, forceProductType = null }) {
    const [activeTab, setActiveTab] = useState('basic');
    const isEdit = !!product;

    const { data: categoriesData } = useCategories();
    const { data: brandsData } = useBrands();
    const { data: uomsData } = useUoms();
    const { data: suppliersData } = useQuery({
        queryKey: ['suppliers', 'all'],
        queryFn: () => suppliersApi.list({ limit: 500 }),
    });
    const createProduct = useCreateProduct();
    const updateProduct = useUpdateProduct();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            productCode: '',
            productShortCode: '',
            type: 'trading',
            status: 'active',
            taxable: true,
            taxRate: 18,
            sellable: true,
            allowBackorder: false,
            minimumOrderQuantity: 1,
            unitOfMeasure: 'pcs',
            basePrice: 0,
        },
    });

    // When opening in edit mode, populate form
    useEffect(() => {
        if (isOpen && product) {
            reset({
                productCode: product.productCode || '',
                productShortCode: product.productShortCode || '',
                name: product.name || '',
                shortName: product.shortName || '',
                sku: product.sku || '',
                barcode: product.barcode || '',
                productType: product.productType || 'finished_good',
                canBeSold: product.canBeSold ?? true,
                canBePurchased: product.canBePurchased ?? true,
                canBeManufactured: product.canBeManufactured ?? false,
                description: product.description || '',
                categoryId: product.categoryId?._id || product.categoryId || '',
                brandId: product.brandId?._id || product.brandId || '',
                type: product.type || 'trading',
                unitOfMeasure: product.unitOfMeasure || '',
                basePrice: product.basePrice || 0,
                mrp: product.mrp || 0,
                taxable: product.tax?.taxable ?? true,
                taxRate: product.tax?.taxRate ?? 18,
                hsCode: product.tax?.hsCode || '',
                minimumLevel: product.stockLevels?.minimumLevel || 0,
                reorderLevel: product.stockLevels?.reorderLevel || 0,
                maximumLevel: product.stockLevels?.maximumLevel || 0,
                unitsPerCarton: product.packaging?.unitsPerCarton || 0,
                cartonsPerPallet: product.packaging?.cartonsPerPallet || 0,
                minimumOrderQuantity: product.salesConfig?.minimumOrderQuantity || 1,
                sellable: product.salesConfig?.sellable ?? true,
                allowBackorder: product.salesConfig?.allowBackorder ?? false,
                status: product.status || 'active',
                notes: product.notes || '',
            });
        } else if (isOpen && !product) {
            const rawCat = forceProductType === 'raw_material' && categoriesData?.data
                ? categoriesData.data.find(c => c.code === 'RAW' || c.name === 'Raw Material')
                : null;

            // Reset to defaults when creating new
            reset({
                productCode: '',
                productShortCode: '',
                type: 'trading',
                status: 'active',
                taxable: true,
                taxRate: 18,
                sellable: forceProductType === 'raw_material' ? false : true,
                allowBackorder: false,
                minimumOrderQuantity: 1,
                productType: forceProductType || 'finished_good',
                categoryId: rawCat ? rawCat._id : '',
                unitOfMeasure: 'pcs',
                basePrice: 0,
            });
        }
        setActiveTab('basic');
    }, [isOpen, product, reset, forceProductType, categoriesData]);

    const selectedCategoryId = watch('categoryId');
    const selectedProductShortCode = watch('productShortCode');
    const [isLoadingCode, setIsLoadingCode] = useState(false);

    useEffect(() => {
        if (!isEdit && isOpen && selectedCategoryId && selectedProductShortCode && selectedProductShortCode.length === 3) {
            const fetchNextCode = async () => {
                setIsLoadingCode(true);
                try {
                    const response = await productsApi.getNextCode(selectedCategoryId, selectedProductShortCode);
                    if (response?.success && response?.productCode) {
                        setValue('productCode', response.productCode);
                    }
                } catch (err) {
                    console.error('Failed to fetch next product code:', err);
                } finally {
                    setIsLoadingCode(false);
                }
            };
            fetchNextCode();
        } else if (!isEdit && isOpen && (!selectedCategoryId || !selectedProductShortCode || selectedProductShortCode.length !== 3)) {
            setValue('productCode', '');
        }
    }, [selectedCategoryId, selectedProductShortCode, isEdit, isOpen, setValue]);

    const onInvalid = (errors) => {
        console.error('Product validation failed:', errors);
        const errorList = Object.values(errors).map((err) => err.message);
        if (errorList.length > 0) {
            toast.error(`Validation error: ${errorList.join(', ')}`);
        }
    };

    const onSubmit = async (data) => {
        const rawCat = forceProductType === 'raw_material' && categoriesData?.data
            ? categoriesData.data.find(c => c.code === 'RAW' || c.name === 'Raw Material')
            : null;

        // Transform flat form data back into nested structure for API
        const payload = {
            productCode: data.productCode || undefined,
            productShortCode: data.productShortCode || undefined,
            name: data.name,
            shortName: data.shortName || undefined,
            sku: data.sku || undefined,
            barcode: data.barcode || undefined,
            productType: forceProductType || data.productType,
            canBeSold: forceProductType === 'raw_material' ? false : data.canBeSold,
            canBePurchased: forceProductType === 'raw_material' ? true : data.canBePurchased,
            canBeManufactured: data.canBeManufactured,
            description: data.description || undefined,
            categoryId: rawCat ? rawCat._id : data.categoryId,
            brandId: data.brandId || undefined,
            type: data.type,
            unitOfMeasure: data.unitOfMeasure,
            basePrice: data.basePrice,
            mrp: data.mrp || undefined,
            tax: {
                taxable: data.taxable,
                taxRate: data.taxRate || 0,
                hsCode: data.hsCode || undefined,
            },
            stockLevels: {
                minimumLevel: data.minimumLevel || 0,
                reorderLevel: data.reorderLevel || 0,
                maximumLevel: data.maximumLevel || 0,
            },
            packaging: {
                unitsPerCarton: data.unitsPerCarton || 0,
                cartonsPerPallet: data.cartonsPerPallet || 0,
            },
            salesConfig: {
                minimumOrderQuantity: data.minimumOrderQuantity || 1,
                sellable: forceProductType === 'raw_material' ? false : data.sellable,
                allowBackorder: data.allowBackorder,
            },
            status: data.status || 'active',
            notes: data.notes || undefined,
        };

        try {
            if (isEdit) {
                await updateProduct.mutateAsync({ id: product._id, data: payload });
            } else {
                await createProduct.mutateAsync(payload);
            }
            onClose();
        } catch (err) {
            // Errors already toasted via hook
        }
    };

    const categoryOptions = (categoriesData?.data || []).map((c) => ({
        value: c._id,
        label: `${c.name} (${c.code})`,
    }));
    const brandOptions = (brandsData?.data || []).map((b) => ({
        value: b._id,
        label: b.name,
    }));
    const supplierOptions = (suppliersData?.data || []).map((s) => ({
        value: s._id,
        label: s.displayName || s.companyName || s.supplierCode,
    }));
    const fetchedUoms = (uomsData?.data || []).map((u) => ({
        value: u.symbol || u.code || u.name,
        label: `${u.name} (${u.symbol || u.code || u.name})`,
    }));
    const uomOptions = fetchedUoms.length > 0 ? fetchedUoms : DEFAULT_UOMS;

    const isLoading = createProduct.isPending || updateProduct.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit Product — ${product?.productCode}` : 'Create New Product'}
            size="xl"
        >
            <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <div className="flex gap-1 px-3 sm:px-6 overflow-x-auto scrollbar-none">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap flex-shrink-0 ${activeTab === tab.id
                                    ? 'border-primary-600 text-primary-600 font-semibold'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-4 sm:p-6">
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input
                                    label="Short Code (e.g. MOR, CLR)"
                                    maxLength={3}
                                    placeholder="3 letters (e.g., MOR=Moratuwa, CLR=Clear)"
                                    disabled={isEdit}
                                    required
                                    error={errors.productShortCode?.message}
                                    {...register('productShortCode')}
                                />
                                <Input
                                    label="Product System Code"
                                    disabled
                                    placeholder={isLoadingCode ? "Generating..." : "Auto-generated after category selection"}
                                    error={errors.productCode?.message}
                                    {...register('productCode')}
                                />
                                <Input 
                                    label="Product Name / Profile Code" 
                                    required 
                                    placeholder="e.g. SD1001 Outer Frame / 5mm Clear Glass"
                                    error={errors.name?.message} 
                                    {...register('name')} 
                                />
                                <Input label="Short Name / Model" placeholder="e.g. Outer Frame (1.2mm)" error={errors.shortName?.message} {...register('shortName')} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Input label="SKU / Manufacturer Code" placeholder="e.g. SWISSTEK-SD1001" error={errors.sku?.message} {...register('sku')} />
                                <Input label="Barcode" placeholder="Scan if available" error={errors.barcode?.message} {...register('barcode')} />
                                <Select
                                    label="Business Line Type"
                                    required
                                    error={errors.type?.message}
                                    options={[
                                        { value: 'trading', label: 'Trading (Profiles, Glass, Accessories)' },
                                        { value: 'manufactured', label: 'Custom Fabricated (Windows & Doors)' },
                                        { value: 'service', label: 'Labor & Installation' },
                                        { value: 'bundle', label: 'Bundle Kit (DIY Openings)' },
                                    ]}
                                    {...register('type')}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Select
                                    label="Material Category"
                                    required
                                    disabled={forceProductType === 'raw_material'}
                                    error={errors.categoryId?.message}
                                    options={categoryOptions}
                                    {...register('categoryId')}
                                />
                                <Select
                                    label="Brand / Supplier"
                                    error={errors.brandId?.message}
                                    options={supplierOptions}
                                    {...register('brandId')}
                                />
                                <Select
                                    label="Inventory Product Type" required
                                    disabled={forceProductType === 'raw_material'}
                                    options={[
                                        { value: 'raw_material', label: 'Raw Profile / Glass Sheet (For fabrication)' },
                                        { value: 'finished_good', label: 'Finished Window / Door (Stock item)' },
                                        { value: 'semi_finished', label: 'Semi-Finished Assembly' },
                                        { value: 'packaging', label: 'Packaging' },
                                        { value: 'consumable', label: 'Consumable & Seals (Beading)' },
                                        { value: 'service', label: 'Labor Service' },
                                    ]}
                                    error={errors.productType?.message}
                                    {...register('productType')}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Select
                                    label="Unit of Measure (UOM)"
                                    required
                                    error={errors.unitOfMeasure?.message}
                                    options={uomOptions}
                                    {...register('unitOfMeasure')}
                                />
                                <Select
                                    label="Status"
                                    required
                                    error={errors.status?.message}
                                    options={[
                                        { value: 'active', label: 'Active' },
                                        { value: 'inactive', label: 'Inactive' },
                                        { value: 'draft', label: 'Draft' },
                                        { value: 'discontinued', label: 'Discontinued' },
                                    ]}
                                    {...register('status')}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pt-2 border-t">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" {...register('canBeSold')} />
                                    Can be sold
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" {...register('canBePurchased')} />
                                    Can be purchased
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" {...register('canBeManufactured')} />
                                    Can be manufactured
                                </label>
                            </div>
                            <Textarea label="Description" rows={3} error={errors.description?.message} {...register('description')} />
                            <Textarea label="Internal Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Base Price (LKR)"
                                    type="number"
                                    step="0.01"
                                    required
                                    error={errors.basePrice?.message}
                                    {...register('basePrice')}
                                />
                                <Input
                                    label="MRP (LKR)"
                                    type="number"
                                    step="0.01"
                                    error={errors.mrp?.message}
                                    {...register('mrp')}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="taxable" {...register('taxable')} />
                                <label htmlFor="taxable" className="text-sm text-gray-700">Taxable (VAT applicable)</label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Tax Rate (%)"
                                    type="number"
                                    step="0.01"
                                    error={errors.taxRate?.message}
                                    {...register('taxRate')}
                                />
                                <Input label="HS Code" error={errors.hsCode?.message} {...register('hsCode')} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'stock' && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-700">Stock Levels</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <Input
                                    label="Minimum Level"
                                    type="number"
                                    error={errors.minimumLevel?.message}
                                    {...register('minimumLevel')}
                                />
                                <Input
                                    label="Reorder Level"
                                    type="number"
                                    error={errors.reorderLevel?.message}
                                    {...register('reorderLevel')}
                                />
                                <Input
                                    label="Maximum Level"
                                    type="number"
                                    error={errors.maximumLevel?.message}
                                    {...register('maximumLevel')}
                                />
                            </div>
                            <h4 className="text-sm font-semibold text-gray-700 pt-4">Packaging</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label="Units per Carton"
                                    type="number"
                                    error={errors.unitsPerCarton?.message}
                                    {...register('unitsPerCarton')}
                                />
                                <Input
                                    label="Cartons per Pallet"
                                    type="number"
                                    error={errors.cartonsPerPallet?.message}
                                    {...register('cartonsPerPallet')}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'sales' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="sellable" {...register('sellable')} />
                                <label htmlFor="sellable" className="text-sm text-gray-700">Sellable (can be added to sales orders)</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="allowBackorder" {...register('allowBackorder')} />
                                <label htmlFor="allowBackorder" className="text-sm text-gray-700">Allow backorder when out of stock</label>
                            </div>
                            <Input
                                label="Minimum Order Quantity"
                                type="number"
                                error={errors.minimumOrderQuantity?.message}
                                {...register('minimumOrderQuantity')}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <Button variant="outline" onClick={onClose} type="button" disabled={isLoading} fullWidth className="sm:w-auto">
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" loading={isLoading} fullWidth className="sm:w-auto">
                        {isEdit ? 'Update Product' : 'Create Product'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}