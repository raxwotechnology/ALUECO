import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import ProductAutocompleteSelect from '../components/ui/ProductAutocompleteSelect';

import { productsApi } from '../features/products/productsApi';
import { useCreateBom, useUpdateBom, useBom } from '../features/boms/useBoms';

export default function BomFormPage() {
    const { id } = useParams();
    const isEdit = !!id;
    const navigate = useNavigate();

    const createMutation = useCreateBom();
    const updateMutation = useUpdateBom();
    const { data: existingBom } = useBom(id);

    const [name, setName] = useState('');
    const [version, setVersion] = useState('1.0');
    const [finishedProductId, setFinishedProductId] = useState('');
    const [outputQuantity, setOutputQuantity] = useState(1);
    const [outputUnitOfMeasure, setOutputUnitOfMeasure] = useState('');
    const [components, setComponents] = useState([
        { productId: '', quantity: 1, wastagePercent: 0, standardCost: 0, componentType: 'raw_material', barLength: '21', base21ftPrice: 0 },
    ]);
    const [labor, setLabor] = useState([]);
    const [overheadPercent, setOverheadPercent] = useState(0);
    const [estimatedHours, setEstimatedHours] = useState(0);
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('active');
    const [isDefault, setIsDefault] = useState(true);

    const { data: productsData } = useQuery({
        queryKey: ['products', 'all'],
        queryFn: () => productsApi.list({ limit: 500 }),
    });
    const [extraProducts, setExtraProducts] = useState([]);
    
    const products = useMemo(() => {
        const fetched = productsData?.data || [];
        return [...fetched, ...extraProducts];
    }, [productsData, extraProducts]);

    // Split products
    const finishedProducts = products.filter((p) =>
        p.canBeManufactured || p.productType === 'finished_good' || p.productType === 'semi_finished'
    );
    const componentProducts = products.filter((p) =>
        p.productType === 'raw_material' || p.productType === 'packaging' ||
        p.productType === 'semi_finished' || p.productType === 'consumable'
    );

    const finishedOptions = finishedProducts.map((p) => ({
        value: p._id, label: `${p.name} (${p.productCode})`,
    }));
    const componentOptions = componentProducts.map((p) => ({
        value: p._id,
        label: `${p.name} · ${p.productCode} · ${p.productType}`,
    }));

    // Preload for edit
    useEffect(() => {
        if (isEdit && existingBom?.data) {
            const bom = existingBom.data;
            setName(bom.name);
            setVersion(bom.version || '1.0');
            setFinishedProductId(bom.finishedProductId?._id || bom.finishedProductId);
            setOutputQuantity(bom.outputQuantity);
            setOutputUnitOfMeasure(bom.outputUnitOfMeasure || '');
            setComponents(bom.components.map((c) => ({
                productId: c.productId?._id || c.productId,
                quantity: c.quantity,
                wastagePercent: c.wastagePercent || 0,
                standardCost: c.standardCost || 0,
                componentType: c.componentType || 'raw_material',
                notes: c.notes || '',
            })));
            setLabor(bom.labor || []);
            setOverheadPercent(bom.overheadPercent || 0);
            setEstimatedHours(bom.estimatedProductionTimeHours || 0);
            setNotes(bom.notes || '');
            setStatus(bom.status);
            setIsDefault(bom.isDefault);
        }
    }, [isEdit, existingBom]);

    // Auto-set UOM from finished product
    useEffect(() => {
        if (!outputUnitOfMeasure && finishedProductId) {
            const p = products.find((x) => x._id === finishedProductId);
            if (p?.unitOfMeasure) setOutputUnitOfMeasure(p.unitOfMeasure);
        }
    }, [finishedProductId, products, outputUnitOfMeasure]);

    const addComponent = () => setComponents([...components, { productId: '', quantity: 1, wastagePercent: 0, standardCost: 0, componentType: 'raw_material', barLength: '21', base21ftPrice: 0 }]);
    const removeComponent = (idx) => setComponents(components.filter((_, i) => i !== idx));
    const updateComponent = (idx, field, value) => {
        const newComps = [...components];
        newComps[idx] = { ...newComps[idx], [field]: value };
        if (field === 'productId' && value) {
            const p = products.find((pr) => pr._id === value);
            if (p) {
                newComps[idx].standardCost = p.costs?.averageCost || p.costs?.lastPurchaseCost || p.basePrice || 0;
                newComps[idx].componentType = p.productType === 'packaging' ? 'packaging'
                    : p.productType === 'semi_finished' ? 'semi_finished'
                        : 'raw_material';
                newComps[idx].base21ftPrice = p.costs?.averageCost || p.costs?.lastPurchaseCost || p.basePrice || 0;
            }
        }
        // Recalculate cost when bar length or base price changes
        if (field === 'barLength' || field === 'base21ftPrice') {
            const barLength = Number(newComps[idx].barLength) || 21;
            const basePrice = Number(newComps[idx].base21ftPrice) || 0;
            const pricePerFoot = basePrice / 21;
            const targetCost = pricePerFoot * barLength;
            newComps[idx].standardCost = targetCost * 1.05; // 105% for wastage
        }
        setComponents(newComps);
    };

    const addLabor = () => setLabor([...labor, { laborType: 'general', description: '', hours: 1, hourlyRate: 0 }]);
    const removeLabor = (idx) => setLabor(labor.filter((_, i) => i !== idx));
    const updateLabor = (idx, field, value) => {
        const newLabor = [...labor];
        newLabor[idx] = { ...newLabor[idx], [field]: value };
        setLabor(newLabor);
    };

    const totals = useMemo(() => {
        let matCost = 0;
        components.forEach((c) => {
            const qty = +c.quantity || 0;
            const cost = +c.standardCost || 0;
            const wastage = +c.wastagePercent || 0;
            matCost += qty * (1 + wastage / 100) * cost;
        });
        let laborCost = 0;
        labor.forEach((l) => {
            laborCost += (+l.hours || 0) * (+l.hourlyRate || 0);
        });
        const overhead = (matCost + laborCost) * (+overheadPercent || 0) / 100;
        const total = matCost + laborCost + overhead;
        const perUnit = outputQuantity > 0 ? total / outputQuantity : 0;
        return {
            material: +matCost.toFixed(2),
            labor: +laborCost.toFixed(2),
            overhead: +overhead.toFixed(2),
            total: +total.toFixed(2),
            perUnit: +perUnit.toFixed(2),
        };
    }, [components, labor, overheadPercent, outputQuantity]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const submit = async () => {
        if (!name || !finishedProductId) { toast.error('Name and finished product required'); return; }
        if (components.length === 0 || components.some((c) => !c.productId || !c.quantity)) {
            toast.error('Each component needs a product and quantity'); return;
        }

        const payload = {
            name, version, finishedProductId,
            outputQuantity: +outputQuantity,
            outputUnitOfMeasure: outputUnitOfMeasure || undefined,
            components: components.map((c) => ({
                productId: c.productId,
                quantity: +c.quantity,
                wastagePercent: +c.wastagePercent || 0,
                standardCost: +c.standardCost || 0,
                componentType: c.componentType,
            })),
            labor: labor.filter((l) => l.hours > 0).map((l) => ({
                laborType: l.laborType, description: l.description,
                hours: +l.hours, hourlyRate: +l.hourlyRate || 0,
            })),
            overheadPercent: +overheadPercent || 0,
            estimatedProductionTimeHours: +estimatedHours || 0,
            status, isDefault,
            notes: notes || undefined,
        };

        try {
            if (isEdit) {
                await updateMutation.mutateAsync({ id, data: payload });
                navigate(`/boms/${id}`);
            } else {
                const result = await createMutation.mutateAsync(payload);
                navigate(`/boms/${result.data._id}`);
            }
        } catch { }
    };

    return (
        <div>
            <PageHeader
                title={isEdit ? 'Edit BOM' : 'New Bill of Materials'}
                description="Define how a finished product is made"
                actions={<Button variant="outline" onClick={() => navigate('/boms')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>}
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Basic Info</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2">
                                    <Input label="Formula Name" required value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                                <Input label="Version" value={version} onChange={(e) => setVersion(e.target.value)} />
                            </div>
                            <ProductAutocompleteSelect
                                label="Finished Product *"
                                placeholder="Type to search or add finished product..."
                                products={finishedProducts}
                                value={finishedProductId}
                                productType="finished_good"
                                onChange={(val, newProd) => {
                                    if (newProd) {
                                        setExtraProducts(prev => [...prev, newProd]);
                                    }
                                    setFinishedProductId(val);
                                }}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Output Quantity (per batch)" required type="number" step="0.01" min="0.01"
                                    value={outputQuantity} onChange={(e) => setOutputQuantity(e.target.value)} />
                                <Input label="Unit of Measure" value={outputUnitOfMeasure}
                                    onChange={(e) => setOutputUnitOfMeasure(e.target.value)} />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">Components / Raw Materials</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                                <Plus size={14} className="mr-1" /> Add Component
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {components.map((c, idx) => {
                                const effective = (+c.quantity || 0) * (1 + (+c.wastagePercent || 0) / 100);
                                const lineTotal = effective * (+c.standardCost || 0);
                                return (
                                    <div key={idx} className="border border-gray-200 rounded-lg p-3">
                                        <div className="flex gap-2 items-start mb-2">
                                            <span className="text-xs text-gray-500 mt-2 w-6">{idx + 1}</span>
                                            <div className="flex-1">
                                                <ProductAutocompleteSelect
                                                    placeholder="Type to search or add component..."
                                                    products={componentProducts}
                                                    value={c.productId}
                                                    productType="raw_material"
                                                    onChange={(val, newProd) => {
                                                        if (newProd) {
                                                            setExtraProducts(prev => [...prev, newProd]);
                                                        }
                                                        updateComponent(idx, 'productId', val);
                                                    }}
                                                />
                                            </div>
                                            <button type="button" onClick={() => removeComponent(idx)}
                                                className="text-red-600 hover:bg-red-50 p-2 rounded mt-1">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-6 gap-2">
                                            <Input label="Qty" type="number" step="0.0001" min="0.0001"
                                                value={c.quantity} onChange={(e) => updateComponent(idx, 'quantity', e.target.value)} />
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Bar Length (ft)</label>
                                                <select
                                                    value={c.barLength || '21'}
                                                    onChange={(e) => updateComponent(idx, 'barLength', e.target.value)}
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                                                >
                                                    <option value="4">4 ft</option>
                                                    <option value="7">7 ft</option>
                                                    <option value="8">8 ft</option>
                                                    <option value="14">14 ft</option>
                                                    <option value="16">16 ft</option>
                                                    <option value="21">21 ft</option>
                                                </select>
                                            </div>
                                            <Input label="Base 21ft Price" type="number" step="0.01" min="0"
                                                value={c.base21ftPrice} onChange={(e) => updateComponent(idx, 'base21ftPrice', e.target.value)} />
                                            <Input label="Std Cost" type="number" step="0.01" min="0"
                                                value={c.standardCost} onChange={(e) => updateComponent(idx, 'standardCost', e.target.value)} />
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Effective Qty</label>
                                                <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm">{effective.toFixed(4)}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Line Cost</label>
                                                <p className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium">{fmt(lineTotal)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">Labor (optional)</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addLabor}>
                                <Plus size={14} className="mr-1" /> Add Labor
                            </Button>
                        </div>
                        {labor.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">No labor tracked for this formula</p>
                        ) : (
                            <div className="space-y-2">
                                {labor.map((l, idx) => (
                                    <div key={idx} className="flex gap-2 items-start border rounded-lg p-2">
                                        <div className="w-32">
                                            <Select options={[
                                                { value: 'skilled', label: 'Skilled' },
                                                { value: 'unskilled', label: 'Unskilled' },
                                                { value: 'supervisor', label: 'Supervisor' },
                                                { value: 'machinist', label: 'Machinist' },
                                                { value: 'general', label: 'General' },
                                            ]} value={l.laborType} onChange={(e) => updateLabor(idx, 'laborType', e.target.value)} />
                                        </div>
                                        <div className="flex-1">
                                            <Input placeholder="Description (e.g., 'Mixing step')"
                                                value={l.description} onChange={(e) => updateLabor(idx, 'description', e.target.value)} />
                                        </div>
                                        <div className="w-24">
                                            <Input type="number" step="0.01" min="0" placeholder="Hours"
                                                value={l.hours} onChange={(e) => updateLabor(idx, 'hours', e.target.value)} />
                                        </div>
                                        <div className="w-28">
                                            <Input type="number" step="0.01" min="0" placeholder="Rate/hr"
                                                value={l.hourlyRate} onChange={(e) => updateLabor(idx, 'hourlyRate', e.target.value)} />
                                        </div>
                                        <button type="button" onClick={() => removeLabor(idx)}
                                            className="text-red-600 hover:bg-red-50 p-2 rounded">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Other</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <Input label="Overhead %" type="number" step="0.01" min="0" max="500"
                                    value={overheadPercent} onChange={(e) => setOverheadPercent(e.target.value)} />
                                <Input label="Est. Production Time (hrs)" type="number" step="0.01" min="0"
                                    value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} />
                                <Select label="Status"
                                    options={[
                                        { value: 'draft', label: 'Draft' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'inactive', label: 'Inactive' },
                                    ]}
                                    value={status} onChange={(e) => setStatus(e.target.value)} />
                            </div>
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                                Make this the default BOM for the finished product
                            </label>
                            <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Cost Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Materials</span><span>{fmt(totals.material)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Labor</span><span>{fmt(totals.labor)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Overhead</span><span>{fmt(totals.overhead)}</span></div>
                            <div className="flex justify-between pt-3 border-t">
                                <span className="font-semibold">Total per batch</span>
                                <span className="font-bold">{fmt(totals.total)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="font-semibold">Cost per unit</span>
                                <span className="font-bold text-primary-600">{fmt(totals.perUnit)}</span>
                            </div>
                            <p className="text-xs text-gray-500 pt-2">
                                1 batch = {outputQuantity} {outputUnitOfMeasure}
                            </p>
                        </div>
                        <Button variant="primary" fullWidth className="mt-6" onClick={submit}
                            loading={createMutation.isPending || updateMutation.isPending}>
                            <Save size={16} className="mr-1.5" /> {isEdit ? 'Update BOM' : 'Create BOM'}
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}