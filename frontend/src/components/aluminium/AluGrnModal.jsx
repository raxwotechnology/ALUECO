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
    const [suppliers, setSuppliers] = useState([]);

    const [form, setForm] = useState({
        warehouseId: '',
        supplierId: '',
        supplierName: '',
        invoiceNumber: '',
        notes: '',
        items: [
            { productId: '', productCode: '', quantityReceived: 10, unitCost: 0, unitOfMeasure: 'Lengths' }
        ]
    });

    useEffect(() => {
        const fetchInitial = async () => {
            try {
                const [whRes, prodRes, poRes, projRes, supRes] = await Promise.all([
                    api.get('/warehouses'),
                    api.get('/alu/raw-materials'),
                    api.get('/alu/purchase-orders?status=pending&status=partially_received'),
                    api.get('/alu/projects/materials-summary'),
                    api.get('/suppliers').catch(() => ({ data: { data: [] } }))
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

                const supList = supRes.data?.data || supRes.data || [];
                setSuppliers(Array.isArray(supList) ? supList : []);
                if (supList.length > 0 && !form.supplierId && !form.supplierName) {
                    setForm(prev => ({
                        ...prev,
                        supplierId: supList[0]._id,
                        supplierName: supList[0].displayName || supList[0].name
                    }));
                }

                // If selected PO is provided, auto-load its items
                if (selectedPo) {
                    const foundPo = typeof selectedPo === 'string' 
                        ? (poRes.data.data || []).find(p => p.poNumber === selectedPo) 
                        : selectedPo;
                    if (foundPo) handleLoadFromPO(foundPo);
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
        const items = (po.items || [])
            .filter(i => {
                const pending = i.pendingQuantity !== undefined ? i.pendingQuantity : i.requiredQuantity;
                return pending > 0 && i.status !== 'fulfilled';
            })
            .map(i => {
                // Try to get cost from PO item first, then from product catalog
                let cost = i.estimatedUnitCost || 0;
                if (!cost && i.productId && aluProducts.length > 0) {
                    const product = aluProducts.find(p => p._id === i.productId?._id || p._id === i.productId);
                    if (product) {
                        cost = product.basePrice || product.costs?.lastPurchaseCost || 0;
                    }
                }
                return {
                    productId: i.productId?._id || i.productId || '',
                    productCode: i.productCode || i.itemCode || '',
                    productName: i.productName || '',
                    quantityReceived: i.pendingQuantity || i.requiredQuantity || 0,
                    unitCost: cost,
                    unitOfMeasure: i.unitOfMeasure || 'Lengths',
                    isFromPO: true,
                    poId: po._id, // Include PO ID for auto-allocation
                    itemId: i._id // Include item ID for tracking
                };
            });

        const poSupplierId = po.supplierId?._id || po.supplierId || '';
        const poSupplierName = po.supplierName || (po.supplierId?.displayName || po.supplierId?.name) || '';

        setForm(prev => ({
            ...prev,
            supplierId: poSupplierId || prev.supplierId,
            supplierName: poSupplierName || prev.supplierName,
            notes: `Fulfilling Shortage PO: ${po.poNumber} (${po.projectName}) - Items will be auto-allocated to project upon receipt`,
            items: items.length ? items : prev.items
        }));
        toast.success(`Loaded ${items.length} shortage items from ${po.poNumber}. Items will be auto-allocated to project.`);
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
                {!selectedPo && pendingPos.length > 0 && (
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
                                Supplier / Extruder <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={form.supplierId || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    const found = suppliers.find(s => s._id === val);
                                    if (found) {
                                        setForm({ ...form, supplierId: found._id, supplierName: found.displayName || found.name || found.companyName });
                                    } else {
                                        setForm({ ...form, supplierId: '', supplierName: '' });
                                    }
                                }}
                                required
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                            >
                                <option value="">-- Select Registered Supplier --</option>
                                {suppliers.map(s => (
                                    <option key={s._id} value={s._id}>
                                        {s.displayName || s.name || s.companyName} {s.category ? `(${s.category})` : ''}
                                    </option>
                                ))}
                            </select>
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

                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px]">
                                <tr>
                                    <th className="p-3">Select Material</th>
                                    <th className="p-3 w-40">Item Code</th>
                                    <th className="p-3 w-28 text-center">Qty</th>
                                    <th className="p-3 w-32 text-right">Unit Cost</th>
                                    <th className="p-3 w-32 text-right">Line Total (Rs)</th>
                                    <th className="p-3 w-12 text-center"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {form.items.map((it, idx) => {
                                    const lineTotal = (Number(it.quantityReceived) || 0) * (Number(it.unitCost) || 0);
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-2 align-top">
                                                {it.isFromPO ? (
                                                    <div className="w-full bg-slate-50/50 border border-slate-200/50 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-700 select-none">
                                                        {it.productCode} {it.productName ? `- ${it.productName}` : ''}
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={it.productId}
                                                        onChange={e => handleProductSelect(idx, e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-400"
                                                    >
                                                        <option value="">-- Choose Raw Material --</option>
                                                        {aluProducts.map(p => (
                                                            <option key={p._id} value={p._id}>
                                                                {p.productCode} - {p.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                                {/* Project Suggestions */}
                                                {it.productCode && (() => {
                                                    const matchingProjects = getMatchingProjects(it.productCode);
                                                    if (matchingProjects.length > 0) {
                                                        return (
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                {matchingProjects.slice(0, 2).map(project => (
                                                                    <span key={project._id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded text-[9px] font-semibold text-indigo-700">
                                                                        <Building2 size={9} />
                                                                        {project.projectName || project.quoteNumber}
                                                                    </span>
                                                                ))}
                                                                {matchingProjects.length > 2 && <span className="text-[9px] text-slate-500 font-bold">+{matchingProjects.length - 2} more</span>}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </td>
                                            <td className="p-2 align-top">
                                                {it.isFromPO ? (
                                                    <div className="w-full bg-slate-50/50 border border-slate-200/50 rounded-lg px-2 py-1.5 text-xs font-mono uppercase text-slate-500 select-none">
                                                        {it.productCode}
                                                    </div>
                                                ) : (
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
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono uppercase focus:outline-none focus:bg-white focus:border-indigo-400"
                                                    />
                                                )}
                                            </td>
                                            <td className="p-2 align-top text-center">
                                                <div className="relative">
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
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-indigo-700 text-center focus:outline-none focus:bg-white focus:border-indigo-400"
                                                    />
                                                    <span className="block text-[9px] text-slate-400 mt-0.5 font-bold">{it.unitOfMeasure || 'Units'}</span>
                                                </div>
                                            </td>
                                            <td className="p-2 align-top text-right">
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
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-right focus:outline-none focus:bg-white focus:border-indigo-400"
                                                />
                                            </td>
                                            <td className="p-2 align-top text-right font-bold text-slate-800 pt-3.5">
                                                {(lineTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-2 align-top text-center pt-2">
                                                {form.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItem(idx)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                        title="Remove Row"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
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
