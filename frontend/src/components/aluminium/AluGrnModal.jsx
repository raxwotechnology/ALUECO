import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import {
    PackageCheck, Plus, Trash2, Save, ShoppingBag, X,
    Building2, Truck, FileText, CheckCircle2, AlertCircle, MapPin
} from 'lucide-react';

export default function AluGrnModal({ isOpen, onClose, onSuccess, selectedPo, prefillItem }) {
    const [loading, setLoading] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
    const [aluProducts, setAluProducts] = useState([]);
    const [pendingPos, setPendingPos] = useState([]);
    const [projectsSummary, setProjectsSummary] = useState([]);

    const [form, setForm] = useState({
        warehouseId: '',
        supplierName: 'Swisstek Aluminium',
        invoiceNumber: '',
        notes: '',
        items: [
            { productId: '', productCode: '', quantityReceived: 10, unitCost: 0, unitOfMeasure: 'Lengths' }
        ]
    });

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [whRes, prodRes, poRes, projRes] = await Promise.all([
                    api.get('/warehouses'),
                    api.get('/alu/raw-materials'),
                    api.get('/alu/purchase-orders?status=pending'),
                    api.get('/alu/projects/materials-summary')
                ]);

                const whList = whRes.data.data || [];
                setWarehouses(whList);
                if (whList.length > 0 && !form.warehouseId) {
                    setForm(prev => ({ ...prev, warehouseId: whList[0]._id }));
                }

                const prods = prodRes.data.data?.products || [];
                setAluProducts(prods);
                setPendingPos(poRes.data.data || []);
                setProjectsSummary(projRes.data.data || []);

                // If selected PO is provided, auto-load its items
                if (selectedPo) {
                    handleLoadFromPO(selectedPo);
                }

                // If prefillItem is provided, auto-fill the first item
                if (prefillItem) {
                    setForm(prev => ({
                        ...prev,
                        items: [{
                            productId: prefillItem.productId || '',
                            productCode: prefillItem.itemCode || prefillItem.productCode || '',
                            productName: prefillItem.productName || '',
                            quantityReceived: prefillItem.pendingQuantity || 1,
                            unitCost: prefillItem.estimatedUnitCost || 0,
                            unitOfMeasure: prefillItem.unitOfMeasure || 'Lengths'
                        }]
                    }));
                }
            } catch (err) {
                console.error('Failed to load GRN requirements:', err);
            }
        };

        if (isOpen) {
            fetchInitial();
        }
    }, [isOpen, selectedPo, prefillItem]);

    const handleProductSelect = (idx, productId) => {
        const prod = aluProducts.find(p => p._id === productId);
        const next = [...form.items];
        next[idx] = {
            ...next[idx],
            productId,
            productCode: prod?.productCode || '',
            unitOfMeasure: prod?.unitOfMeasure || 'Lengths',
            unitCost: prod?.basePrice || prod?.costs?.lastPurchaseCost || 0
        };
        setForm({ ...form, items: next });
    };

    const addItem = () => {
        setForm(prev => ({
            ...prev,
            items: [...prev.items, { productId: '', productCode: '', quantityReceived: 10, unitCost: 0, unitOfMeasure: 'Lengths' }]
        }));
    };

    const removeItem = (idx) => {
        if (form.items.length <= 1) return;
        setForm(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx)
        }));
    };

    const handleLoadFromPO = (po) => {
        const items = (po.items || []).map(i => ({
            productId: i.productId?._id || i.productId || '',
            productCode: i.productCode || '',
            quantityReceived: i.pendingQuantity || i.quantityRequired || 0,
            unitCost: i.estimatedUnitCost || 0,
            unitOfMeasure: i.unit || 'Lengths'
        }));

        setForm(prev => ({
            ...prev,
            supplierName: po.supplierName || prev.supplierName,
            notes: `Fulfilling Shortage PO: ${po.poNumber} (${po.projectName})`,
            items: items.length ? items : prev.items
        }));
        toast.success(`Loaded ${items.length} shortage items from ${po.poNumber}`);
    };

    // Find projects that need this material
    const getMatchingProjects = (itemCode) => {
        const code = (itemCode || '').toUpperCase();
        if (!code || !projectsSummary.length) return [];

        return projectsSummary.filter(project => {
            const profiles = project.profiles || [];
            const glass = project.glass || [];
            const accessories = project.accessories || [];

            // Check if project needs this profile code
            const needsProfile = profiles.some(p => 
                (p.code || '').toUpperCase() === code && (p.totalRequiredBars || 0) > (p.availableStockBars || 0)
            );

            // Check if project needs this glass type
            const needsGlass = glass.some(g => 
                (g.type || '').toUpperCase() === code && (g.totalAreaSqFt || 0) > (g.availableStockSqFt || 0)
            );

            // Check if project needs this accessory
            const needsAccessory = accessories.some(a => 
                (a.code || '').toUpperCase() === code && (a.totalRequired || 0) > (a.availableStock || 0)
            );

            return needsProfile || needsGlass || needsAccessory;
        });
    };

    const totalGrnValue = form.items.reduce((sum, item) => {
        return sum + (Number(item.quantityReceived || 0) * Number(item.unitCost || 0));
    }, 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.warehouseId) {
            toast.error('Please select destination warehouse');
            return;
        }

        if (!form.items.length || form.items.some(i => !i.productCode || !i.quantityReceived)) {
            toast.error('Please fill in material and received quantity for all items');
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post('/alu/grn', form);
            toast.success(data.message || 'AluEco GRN received and stock updated successfully!');
            onSuccess?.();
            onClose();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to process AluEco GRN');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="AluEco Goods Receipt Note (GRN)" size="xl">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
                
                {/* 01. Pending Shortage PO Banner */}
                {pendingPos.length > 0 && (
                    <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 rounded-2xl space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white">
                                    <ShoppingBag size={11} />
                                </span>
                                <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                                    Pending AluEco Shortage Requisitions ({pendingPos.length})
                                </span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-200/70 px-2 py-0.5 rounded-full">
                                1-Click Auto-Fill
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {pendingPos.map(po => (
                                <button
                                    key={po._id}
                                    type="button"
                                    onClick={() => handleLoadFromPO(po)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-amber-100/80 border border-amber-300 rounded-xl text-xs font-mono font-bold text-amber-900 shadow-sm transition hover:scale-[1.02]"
                                >
                                    <span className="text-amber-600 font-sans">+</span> {po.poNumber}
                                    <span className="font-sans text-[11px] font-normal text-amber-700">({po.projectName})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* 02. Supplier & Warehouse Details */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3.5">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold">1</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Shipment & Delivery Details</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Destination Warehouse <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={form.warehouseId}
                                onChange={e => setForm({ ...form, warehouseId: e.target.value })}
                                required
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                            >
                                {warehouses.map(w => (
                                    <option key={w._id} value={w._id}>{w.name} ({w.warehouseCode})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Supplier / Extruder
                            </label>
                            <input
                                type="text"
                                value={form.supplierName}
                                onChange={e => setForm({ ...form, supplierName: e.target.value })}
                                placeholder="e.g. Swisstek Aluminium"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                Delivery / Invoice Ref #
                            </label>
                            <input
                                type="text"
                                value={form.invoiceNumber}
                                onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
                                placeholder="e.g. INV-9082"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* 03. Received Material Items */}
                <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold">2</span>
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">Received Aluminium Materials</span>
                        </div>
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-2.5 py-1 rounded-lg shadow-sm transition hover:scale-[1.02]"
                        >
                            <Plus size={14} /> Add Line
                        </button>
                    </div>

                    <div className="space-y-2.5">
                        {form.items.map((it, idx) => {
                            const lineTotal = (Number(it.quantityReceived) || 0) * (Number(it.unitCost) || 0);

                            return (
                                <div key={idx} className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                                        <div className="sm:col-span-5">
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                Select Material
                                            </label>
                                            <select
                                                value={it.productId}
                                                onChange={e => handleProductSelect(idx, e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                                            >
                                                <option value="">-- Choose Raw Material --</option>
                                                {aluProducts.map(p => (
                                                    <option key={p._id} value={p._id}>
                                                        {p.productCode} - {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="sm:col-span-3">
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                Item Code
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={15}
                                                value={it.productCode}
                                                onChange={e => {
                                                    const next = [...form.items];
                                                    next[idx].productCode = e.target.value.toUpperCase();
                                                    setForm({ ...form, items: next });
                                                }}
                                                required
                                                placeholder="PRF-..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono uppercase focus:outline-none focus:bg-white"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                Qty ({it.unitOfMeasure || 'Units'})
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0.01"
                                                value={it.quantityReceived}
                                                onChange={e => {
                                                    const next = [...form.items];
                                                    next[idx].quantityReceived = Number(e.target.value);
                                                    setForm({ ...form, items: next });
                                                }}
                                                required
                                                placeholder="0.00"
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-indigo-700 focus:outline-none focus:bg-white"
                                            />
                                        </div>

                                        <div className="sm:col-span-2 flex items-center gap-1.5">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                                    Cost (LKR)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    value={it.unitCost}
                                                    onChange={e => {
                                                        const next = [...form.items];
                                                        next[idx].unitCost = Number(e.target.value);
                                                        setForm({ ...form, items: next });
                                                    }}
                                                    placeholder="0.00"
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:bg-white"
                                                />
                                            </div>
                                            {form.items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(idx)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                                                    title="Remove Row"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Line item subtotal badge */}
                                    <div className="flex justify-end text-[11px] font-medium text-slate-500 pr-2">
                                        Line Total: <strong className="ml-1 text-slate-800">Rs. {lineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong>
                                    </div>

                                    {/* Project Suggestions */}
                                    {it.productCode && (
                                        <div className="mt-2 pt-2 border-t border-slate-100">
                                            {(() => {
                                                const matchingProjects = getMatchingProjects(it.productCode);
                                                if (matchingProjects.length === 0) {
                                                    return (
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                            <CheckCircle2 size={11} />
                                                            <span>No pending projects require this material</span>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="space-y-1.5">
                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600">
                                                            <MapPin size={11} />
                                                            <span>Required by {matchingProjects.length} project(s):</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {matchingProjects.slice(0, 3).map(project => (
                                                                <span
                                                                    key={project._id}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-semibold text-indigo-700"
                                                                >
                                                                    <Building2 size={9} />
                                                                    {project.projectName || project.quoteNumber}
                                                                </span>
                                                            ))}
                                                            {matchingProjects.length > 3 && (
                                                                <span className="text-[10px] text-slate-500 font-medium">
                                                                    +{matchingProjects.length - 3} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Total GRN Value Banner */}
                    <div className="flex items-center justify-between p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl mt-2">
                        <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">Total Received Shipment Value</span>
                        <span className="text-base font-extrabold text-indigo-700">
                            Rs. {totalGrnValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                    >
                        <PackageCheck size={16} />
                        {loading ? 'Receiving Materials...' : 'Complete & Post GRN'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
