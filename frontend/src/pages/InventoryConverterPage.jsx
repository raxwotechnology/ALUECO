import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { RefreshCw, ArrowRight, Save, Info, AlertTriangle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';

export default function InventoryConverterPage() {
    const { user } = useAuthStore();
    const canConvert = ['admin', 'manager', 'production_staff', 'warehouse_staff'].includes(user?.role);

    const [warehouses, setWarehouses] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [warehouseId, setWarehouseId] = useState('');
    const [sourceProductId, setSourceProductId] = useState('');
    const [inputQuantity, setInputQuantity] = useState('');
    const [outputQuantity, setOutputQuantity] = useState('');
    const [notes, setNotes] = useState('');

    // Yield Prediction State
    const [predicting, setPredicting] = useState(false);
    const [yieldPrediction, setYieldPrediction] = useState(null);

    const fetchDropdowns = useCallback(async () => {
        setLoading(true);
        try {
            const [whRes, prodRes] = await Promise.all([
                api.get('/warehouses'),
                api.get('/products')
            ]);
            setWarehouses(whRes.data.data || []);
            setWarehouseId(whRes.data.data?.[0]?._id || '');

            // Filter for raw materials
            const raws = (prodRes.data.data || []).filter(p => p.type === 'raw_material');
            setRawMaterials(raws);
            setSourceProductId(raws[0]?._id || '');
        } catch (err) {
            toast.error('Failed to load warehouses and product catalog');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDropdowns();
    }, [fetchDropdowns]);

    // Fetch yield prediction when source product or input quantity changes
    useEffect(() => {
        const getPrediction = async () => {
            if (!sourceProductId || !inputQuantity || Number(inputQuantity) <= 0) {
                setYieldPrediction(null);
                setOutputQuantity('');
                return;
            }

            setPredicting(true);
            try {
                const res = await api.get(`/products/predict-yield?productId=${sourceProductId}&inputWeight=${inputQuantity}`);
                if (res.data.success && res.data.data) {
                    setYieldPrediction(res.data.data);
                    // Pre-fill actual output weight with predicted output weight
                    setOutputQuantity(res.data.data.predictedWeight);
                } else {
                    setYieldPrediction(null);
                    setOutputQuantity('');
                }
            } catch (err) {
                setYieldPrediction(null);
                setOutputQuantity('');
            } finally {
                setPredicting(false);
            }
        };

        const timer = setTimeout(() => {
            getPrediction();
        }, 500); // Debounce API requests

        return () => clearTimeout(timer);
    }, [sourceProductId, inputQuantity]);

    const handleConversionSubmit = async (e) => {
        e.preventDefault();
        if (!warehouseId) return toast.error('Please select a warehouse');
        if (!sourceProductId) return toast.error('Please select a raw material');
        if (!inputQuantity || Number(inputQuantity) <= 0) return toast.error('Please enter a valid input weight');
        if (!outputQuantity || Number(outputQuantity) <= 0) return toast.error('Please enter a valid actual yield weight');
        if (!yieldPrediction?.outputProduct?._id) return toast.error('No conversion formula found for this raw material');

        setSaving(true);
        try {
            await api.post('/stock/convert', {
                sourceProductId,
                destinationProductId: yieldPrediction.outputProduct._id,
                warehouseId,
                inputQuantity: Number(inputQuantity),
                outputQuantity: Number(outputQuantity),
                notes
            });

            toast.success('🎉 Stock converted and completed production batch logged successfully!');
            // Reset form
            setInputQuantity('');
            setOutputQuantity('');
            setNotes('');
            setYieldPrediction(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Stock conversion failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="py-16 text-center text-gray-500">Loading conversion tools...</div>;
    }

    const activeSourceProd = rawMaterials.find(p => p._id === sourceProductId);

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <PageHeader
                title="Direct Inventory Converter"
                description="Instantly convert raw materials to finished items and register completed production logs"
            />

            <Card className="p-6">
                <form onSubmit={handleConversionSubmit} className="space-y-6">
                    {/* Warehouse selection */}
                    <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Select Operations Warehouse *</label>
                        <select
                            value={warehouseId}
                            onChange={(e) => setWarehouseId(e.target.value)}
                            required
                            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium"
                        >
                            {warehouses.map(w => (
                                <option key={w._id} value={w._id}>{w.name} ({w.warehouseCode})</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Raw material stock will be deducted and finished goods stock added to this warehouse.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Source Raw Material */}
                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Source Raw Material *</label>
                            <select
                                value={sourceProductId}
                                onChange={(e) => setSourceProductId(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white font-semibold"
                            >
                                <option value="">Select Raw Material</option>
                                {rawMaterials.map(p => (
                                    <option key={p._id} value={p._id}>{p.name} ({p.productCode})</option>
                                ))}
                            </select>
                        </div>

                        {/* Input weight */}
                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">
                                Input Weight / Qty ({activeSourceProd?.unitOfMeasure || 'Kg'}) *
                            </label>
                            <input
                                type="number"
                                min="0.01"
                                step="any"
                                placeholder="e.g. 500"
                                value={inputQuantity}
                                onChange={(e) => setInputQuantity(e.target.value)}
                                required
                                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none font-bold"
                            />
                        </div>
                    </div>

                    {/* Yield predictor / Output display */}
                    {predicting && (
                        <div className="py-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                            <RefreshCw size={14} className="animate-spin text-primary-500" /> Computing formula expectations...
                        </div>
                    )}

                    {yieldPrediction && (
                        <div className="border border-primary-100 bg-primary-50 rounded-xl p-4 space-y-3">
                            <div className="flex items-start gap-2 text-primary-800">
                                <Info size={18} className="shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold text-sm block">Active Conversion Formula Found</span>
                                    <p className="text-xs text-primary-750 font-medium">
                                        1 Kg of <span className="font-bold">{activeSourceProd?.name}</span> yields <span className="font-bold">{(yieldPrediction.ratio).toFixed(3)} Kg</span> of finished <span className="font-bold">{yieldPrediction.outputProduct?.name}</span>.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 py-2 border-y border-primary-200/50">
                                <div className="flex-1 text-center bg-white p-3 rounded-lg border border-primary-100">
                                    <span className="text-xs text-gray-500 block uppercase font-semibold">Source Quantity</span>
                                    <span className="text-lg font-bold text-gray-800">{inputQuantity} {activeSourceProd?.unitOfMeasure}</span>
                                </div>
                                <ArrowRight className="text-primary-400" size={20} />
                                <div className="flex-1 text-center bg-white p-3 rounded-lg border border-primary-100">
                                    <span className="text-xs text-gray-500 block uppercase font-semibold">Expected Finished Yield</span>
                                    <span className="text-lg font-extrabold text-emerald-600">{yieldPrediction.predictedWeight} {yieldPrediction.outputProduct?.unitOfMeasure}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div>
                                    <label className="text-xs font-bold text-primary-800 block mb-1">
                                        Actual Yield Quantity ({yieldPrediction.outputProduct?.unitOfMeasure}) *
                                    </label>
                                    <input
                                        type="number"
                                        min="0.01"
                                        step="any"
                                        value={outputQuantity}
                                        onChange={(e) => setOutputQuantity(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 border border-primary-200 focus:border-primary-500 rounded-lg text-sm outline-none font-bold text-emerald-700 bg-white"
                                    />
                                    <span className="text-[10px] text-gray-500">Edit this if actual production yield differs from predicted weight.</span>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-600 block mb-1">Destination Product</label>
                                    <div className="px-3 py-2 border border-gray-200 bg-gray-100 rounded-lg text-sm font-semibold text-gray-700">
                                        {yieldPrediction.outputProduct?.name} ({yieldPrediction.outputProduct?.productCode})
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {inputQuantity && !yieldPrediction && !predicting && (
                        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 flex gap-2 text-amber-800 text-xs">
                            <AlertTriangle size={18} className="shrink-0" />
                            <div>
                                <span className="font-bold block">No Yield Formula Setup</span>
                                There is no active conversion rule mapping <span className="font-bold">{activeSourceProd?.name}</span> to a finished product. Please setup conversion rules first, or verify if the material is configured correctly.
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-gray-600 block mb-1">Operation / Conversion Notes</label>
                        <textarea
                            placeholder="e.g. Dry run conversion batch. Standard parameters applied."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>

                    <div className="flex justify-end pt-3">
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={saving || !yieldPrediction || !canConvert}
                            className="w-full md:w-auto"
                        >
                            <Save size={16} className="mr-1.5" /> {saving ? 'Converting...' : 'Process Stock Conversion'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}
