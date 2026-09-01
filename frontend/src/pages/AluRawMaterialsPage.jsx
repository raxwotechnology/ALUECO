import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import {
    Search, Boxes, AlertTriangle, RefreshCw, Plus, PackageCheck,
    Layers, Tag, DollarSign, Filter, ShieldCheck, ArrowRight,
    TrendingUp, PlusCircle, MinusCircle, Edit3, X, Save, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import AluRawMaterialModal from '../components/aluminium/AluRawMaterialModal';
import AluGrnModal from '../components/aluminium/AluGrnModal';

const ALU_CATEGORIES = [
    { id: 'all', label: 'All Aluminium Stock' },
    { id: 'profiles', label: 'Profiles & Extrusions' },
    { id: 'glass', label: 'Glass Sheets' },
    { id: 'accessories', label: 'Accessories & Rollers' },
    { id: 'hardware', label: 'Hardware & Locks' },
    { id: 'gaskets', label: 'Gaskets & Rubber' },
];

export default function AluRawMaterialsPage() {
    const navigate = useNavigate();
    const [stockItems, setStockItems] = useState([]);
    const [allProducts, setAllProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);

    // Stock Quantity Add / Adjustment Modal State
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustingStockItem, setAdjustingStockItem] = useState(null);
    const [submittingAdjust, setSubmittingAdjust] = useState(false);
    const [adjustForm, setAdjustForm] = useState({
        productId: '',
        warehouseId: '',
        actionType: 'add', // 'add' | 'reduce' | 'opening'
        quantity: 10,
        costPerUnit: 0,
        reason: 'Direct Stock In / Opening Balance',
        notes: ''
    });

    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [aluRes, whRes] = await Promise.all([
                api.get('/alu/raw-materials'),
                api.get('/warehouses')
            ]);
            
            const prods = aluRes.data?.data?.products || [];
            const stock = aluRes.data?.data?.stockItems || [];

            // If some products don't have stock items yet, create dummy visual representation with 0 onHand
            const productIdsInStock = new Set(stock.map(s => s.productId?._id?.toString() || s.productId?.toString()));
            const emptyItems = prods
                .filter(p => !productIdsInStock.has(p._id.toString()))
                .map(p => ({
                    _id: `temp-${p._id}`,
                    productId: p,
                    productCode: p.productCode,
                    productName: p.name,
                    warehouseName: whRes.data.data?.[0]?.name || 'Main Warehouse',
                    warehouseId: whRes.data.data?.[0]?._id,
                    batchNumber: 'Standard Stock',
                    quantities: { onHand: 0, reserved: 0, available: 0 },
                    unitOfMeasure: p.unitOfMeasure || 'Lengths',
                    costPerUnit: p.costs?.lastPurchaseCost || p.basePrice || 0,
                    totalValue: 0
                }));

            setStockItems([...stock, ...emptyItems]);
            setAllProducts(prods);
            setWarehouses(whRes.data.data || []);
        } catch (err) {
            console.error('Failed to load aluminium inventory:', err);
            toast.error('Failed to load raw material inventory');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const openAdjustModal = (item = null) => {
        setAdjustingStockItem(item);
        if (item) {
            const pId = item.productId?._id || item.productId || '';
            const wId = item.warehouseId?._id || item.warehouseId || (warehouses[0]?._id || '');
            setAdjustForm({
                productId: pId,
                warehouseId: wId,
                actionType: 'add',
                quantity: 10,
                costPerUnit: item.costPerUnit || 0,
                reason: 'Stock Quantity Addition',
                notes: `Added quantity for ${item.productName || item.productCode}`
            });
        } else {
            setAdjustForm({
                productId: allProducts[0]?._id || '',
                warehouseId: warehouses[0]?._id || '',
                actionType: 'add',
                quantity: 10,
                costPerUnit: 0,
                reason: 'Opening Balance / Initial Stock',
                notes: ''
            });
        }
        setIsAdjustModalOpen(true);
    };

    const handleEditItem = (item) => {
        const productId = item.productId?._id || item.productId;
        if (!productId) {
            toast.error('Cannot edit: Product ID not found');
            return;
        }
        // Open the modal in edit mode with the product data
        // For now, we'll just show a toast since the modal needs edit mode support
        toast.info('Edit functionality will be implemented in the modal');
    };

    const handleDeleteItem = async (item) => {
        const productId = item.productId?._id || item.productId;
        if (!productId) {
            toast.error('Cannot delete: Product ID not found');
            return;
        }
        if (!window.confirm(`Are you sure you want to delete "${item.productName || item.productCode}"?`)) {
            return;
        }
        try {
            await api.delete(`/alu/raw-materials/${productId}`);
            toast.success('Material deleted successfully');
            fetchAllData();
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error(error.response?.data?.message || 'Failed to delete material');
        }
    };

    const handleAdjustSubmit = async (e) => {
        e.preventDefault();
        if (!adjustForm.productId || !adjustForm.warehouseId || !adjustForm.quantity) {
            toast.error('Please fill in product, warehouse, and quantity');
            return;
        }

        setSubmittingAdjust(true);
        try {
            if (adjustForm.actionType === 'opening') {
                // Opening stock
                await api.post('/stock/opening', {
                    warehouseId: adjustForm.warehouseId,
                    items: [{
                        productId: adjustForm.productId,
                        quantity: Number(adjustForm.quantity),
                        costPerUnit: Number(adjustForm.costPerUnit) || 0
                    }],
                    notes: adjustForm.notes || adjustForm.reason
                });
                toast.success('Opening stock quantity recorded successfully!');
            } else {
                // Adjustment In or Out
                const deltaQty = adjustForm.actionType === 'reduce' 
                    ? -Math.abs(Number(adjustForm.quantity)) 
                    : Math.abs(Number(adjustForm.quantity));

                await api.post('/stock/adjustment', {
                    warehouseId: adjustForm.warehouseId,
                    reason: adjustForm.reason,
                    notes: adjustForm.notes,
                    items: [{
                        productId: adjustForm.productId,
                        adjustmentQuantity: deltaQty,
                        costPerUnit: Number(adjustForm.costPerUnit) || 0,
                        reason: adjustForm.reason
                    }]
                });
                toast.success(`Successfully ${deltaQty > 0 ? 'added' : 'reduced'} ${Math.abs(deltaQty)} units in stock!`);
            }

            setIsAdjustModalOpen(false);
            fetchAllData();
        } catch (error) {
            console.error('Adjustment failed:', error);
            toast.error(error.response?.data?.message || 'Failed to update stock quantity');
        } finally {
            setSubmittingAdjust(false);
        }
    };

    const getStockStatus = (item) => {
        const onHand = item.quantities?.onHand || 0;
        const reorder = item.productId?.stockLevels?.reorderLevel || 0;
        const min = item.productId?.stockLevels?.minimumLevel || 0;

        if (onHand <= 0) return { variant: 'danger', label: 'Out of stock' };
        if (onHand <= min) return { variant: 'danger', label: 'Critical' };
        if (reorder && onHand <= reorder) return { variant: 'warning', label: 'Low' };
        return { variant: 'success', label: 'In stock' };
    };

    // Filter items based on Category, Search, Warehouse, and Status
    const filteredItems = stockItems.filter(item => {
        const p = item.productId || {};
        const name = (p.name || item.productName || '').toLowerCase();
        const code = (p.productCode || item.productCode || '').toLowerCase();
        const batch = (item.batchNumber || '').toLowerCase();

        const matchesSearch = name.includes(search.toLowerCase()) || 
                              code.includes(search.toLowerCase()) ||
                              batch.includes(search.toLowerCase());

        const matchesWh = warehouseFilter ? (item.warehouseId?._id === warehouseFilter || item.warehouseId === warehouseFilter) : true;
        
        const status = getStockStatus(item);
        const matchesStatus = 
            statusFilter === 'in_stock' ? status.variant === 'success' :
            statusFilter === 'low' ? (status.variant === 'warning' || status.variant === 'danger') :
            statusFilter === 'out_of_stock' ? (item.quantities?.onHand || 0) <= 0 : true;

        if (!matchesSearch || !matchesWh || !matchesStatus) return false;

        if (activeCategory === 'profiles') return name.includes('profile') || code.startsWith('prf') || code.startsWith('ap');
        if (activeCategory === 'glass') return name.includes('glass') || code.startsWith('gls') || code.startsWith('ag');
        if (activeCategory === 'accessories') return name.includes('accessory') || name.includes('roller') || code.startsWith('acc');
        if (activeCategory === 'hardware') return name.includes('lock') || name.includes('hinge') || name.includes('handle');
        if (activeCategory === 'gaskets') return name.includes('gasket') || name.includes('rubber') || name.includes('wool');

        return true;
    });

    const totalQty = filteredItems.reduce((sum, i) => sum + (i.quantities?.onHand || 0), 0);
    const totalValue = filteredItems.reduce((sum, i) => sum + (i.totalValue || 0), 0);
    const lowStockCount = filteredItems.filter(i => {
        const s = getStockStatus(i);
        return s.variant === 'warning' || s.variant === 'danger';
    }).length;

    const columns = [
        {
            key: 'productCode',
            label: 'Item Code',
            render: (r) => (
                <div>
                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-xs">
                        {r.productCode || r.productId?.productCode}
                    </span>
                    <span className="block text-[10px] text-gray-400 font-semibold tracking-wider uppercase mt-0.5">MAX 25 CHARS</span>
                </div>
            )
        },
        { 
            key: 'productName', 
            label: 'Material Name', 
            render: (r) => (
                <div>
                    <span className="font-bold text-gray-900 text-sm block">{r.productName || r.productId?.name}</span>
                    <span className="text-xs text-gray-400">{r.productId?.category?.name || 'Aluminium Stock'}</span>
                </div>
            ) 
        },
        { 
            key: 'warehouseName', 
            label: 'Warehouse', 
            render: (r) => r.warehouseName || r.warehouseId?.name 
        },
        {
            key: 'batchNumber',
            label: 'Batch / Lot No',
            render: (r) => (
                <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {r.batchNumber || 'Standard Stock'}
                </span>
            )
        },
        {
            key: 'receivedGrn',
            label: 'Received GRN',
            render: (r) => (
                <span className="font-mono text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    {r.grnNumber || '-'}
                </span>
            )
        },
        { 
            key: 'onHand', 
            label: 'On Hand', 
            render: (r) => <span className="font-extrabold text-gray-900">{r.quantities?.onHand} {r.unitOfMeasure}</span> 
        },
        { 
            key: 'reserved', 
            label: 'Reserved (Project)', 
            render: (r) => <span className="font-medium text-amber-600">{(r.quantities?.reserved || 0)} {r.unitOfMeasure}</span> 
        },
        { 
            key: 'available', 
            label: 'Available', 
            render: (r) => <span className="font-extrabold text-emerald-600">{r.quantities?.available} {r.unitOfMeasure}</span> 
        },
        { 
            key: 'costPerUnit', 
            label: 'Unit Cost', 
            render: (r) => `Rs. ${(r.costPerUnit || 0).toFixed(2)}` 
        },
        { 
            key: 'totalValue', 
            label: 'Total Value', 
            render: (r) => `Rs. ${(r.totalValue || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}` 
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => {
                const s = getStockStatus(r);
                return <Badge variant={s.variant}>{s.label}</Badge>;
            }
        },
        {
            key: 'actions',
            label: 'Action',
            render: (r) => (
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => openAdjustModal(r)}
                        className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition"
                        title="Add or Adjust Stock Quantity"
                    >
                        <Plus size={14} /> Add Qty
                    </button>
                    <button
                        onClick={() => handleEditItem(r)}
                        className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition"
                        title="Edit Material"
                    >
                        <Edit3 size={14} /> Edit
                    </button>
                    <button
                        onClick={() => handleDeleteItem(r)}
                        className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1.5 rounded-lg text-xs transition"
                        title="Delete Material"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="AluEco Raw Materials & Inventory"
                description="Manage profiles, glass, accessories, hardware stock, monitor project reservations and intake via GRN or direct quantity addition"
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" onClick={() => setIsGrnModalOpen(true)}>
                            <PackageCheck size={16} className="mr-1.5" />
                            Receive Stock (GRN)
                        </Button>
                        <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                            <Plus size={16} className="mr-1.5" />
                            Add Aluminium Material & Stock
                        </Button>
                    </div>
                }
            />

            {/* Stats strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 flex flex-col justify-between border-l-4 border-l-blue-500">
                    <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">Total Stock Volume</span>
                        <span className="text-2xl font-extrabold text-gray-900">{totalQty.toLocaleString()} Units</span>
                        <span className="text-xs text-gray-500 block mt-0.5">{filteredItems.length} active material items</span>
                    </div>
                </Card>

                <Card className="p-4 flex flex-col justify-between border-l-4 border-l-emerald-500">
                    <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">Aluminium Inventory Value</span>
                        <span className="text-2xl font-extrabold text-emerald-600">Rs. {totalValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                        <span className="text-xs text-gray-500 block mt-0.5">Asset valuation at current unit costs</span>
                    </div>
                </Card>

                <Card className="p-4 flex flex-col justify-between border-l-4 border-l-amber-500">
                    <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider block mb-1">Low / Critical Materials</span>
                        <span className={`text-2xl font-extrabold ${lowStockCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{lowStockCount} Items</span>
                        <span className="text-xs text-gray-500 block mt-0.5">Needs reorder / procurement</span>
                    </div>
                </Card>
            </div>

            {/* Category Segment Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
                {ALU_CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                            activeCategory === cat.id
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            <Card className="p-4">
                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 w-full sm:w-80">
                        <Search size={16} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by code, material, batch..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm w-full"
                        />
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <select
                            value={warehouseFilter}
                            onChange={(e) => setWarehouseFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="">All Warehouses</option>
                            {warehouses.map(w => (
                                <option key={w._id} value={w._id}>{w.name}</option>
                            ))}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="">All Stock Levels</option>
                            <option value="in_stock">In Stock</option>
                            <option value="low">Low & Critical</option>
                            <option value="out_of_stock">Out of Stock</option>
                        </select>

                        <button onClick={fetchAllData} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition" title="Refresh">
                            <RefreshCw size={16} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-gray-500">Loading aluminium stock levels...</div>
                ) : filteredItems.length === 0 ? (
                    <EmptyState
                        icon={Boxes}
                        title="No aluminium materials found in this category"
                        description="Record a Goods Receipt Note (GRN) or click '+ Add Stock Quantity' to add opening stock."
                    />
                ) : (
                    <Table columns={columns} data={filteredItems} />
                )}
            </Card>

            {/* Dedicated AluEco Raw Material Creation Modal */}
            <AluRawMaterialModal
                isOpen={isFormOpen}
                warehouses={warehouses}
                onClose={() => setIsFormOpen(false)}
                onSuccess={fetchAllData}
            />

            {/* Dedicated AluEco GRN Intake Modal */}
            <AluGrnModal
                isOpen={isGrnModalOpen}
                warehouses={warehouses}
                onClose={() => setIsGrnModalOpen(false)}
                onSuccess={fetchAllData}
            />

            {/* Direct Add / Adjust Stock Quantity Modal */}
            <Modal
                isOpen={isAdjustModalOpen}
                onClose={() => setIsAdjustModalOpen(false)}
                title={adjustingStockItem ? `Adjust Stock: ${adjustingStockItem.productName || adjustingStockItem.productCode}` : 'Stock Quantity In / Opening Balance'}
            >
                <form onSubmit={handleAdjustSubmit} className="space-y-5 px-1 py-1">
                    {/* Material Selector */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Aluminium Raw Material <span className="text-rose-500">*</span>
                        </label>
                        {adjustingStockItem ? (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 flex justify-between items-center shadow-sm">
                                <div>
                                    <span className="font-bold block text-slate-900">{adjustingStockItem.productName}</span>
                                    <span className="text-xs text-slate-500 font-normal">{adjustingStockItem.productId?.aluSpecs?.series || 'Aluminium Stock'}</span>
                                </div>
                                <span className="font-mono font-bold bg-white border border-slate-200 text-indigo-700 px-2.5 py-1 rounded-xl text-xs shadow-inner">
                                    {adjustingStockItem.productCode}
                                </span>
                            </div>
                        ) : (
                            <select
                                value={adjustForm.productId}
                                onChange={e => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                                required
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                            >
                                <option value="">-- Choose Material Item --</option>
                                {allProducts.map(p => (
                                    <option key={p._id} value={p._id}>
                                        {p.productCode} - {p.name} ({p.unitOfMeasure || 'Units'})
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Warehouse */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Target Warehouse Location <span className="text-rose-500">*</span>
                        </label>
                        <select
                            value={adjustForm.warehouseId}
                            onChange={e => setAdjustForm({ ...adjustForm, warehouseId: e.target.value })}
                            required
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                        >
                            {warehouses.map(w => (
                                <option key={w._id} value={w._id}>{w.name} ({w.warehouseCode})</option>
                            ))}
                        </select>
                    </div>

                    {/* Current Stock Preview if editing */}
                    {adjustingStockItem && (
                        <div className="grid grid-cols-2 gap-3 p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-xs">
                            <div>
                                <span className="text-slate-500 font-medium block">Current On Hand:</span>
                                <strong className="text-indigo-950 text-sm font-extrabold">{adjustingStockItem.quantities?.onHand || 0} {adjustingStockItem.unitOfMeasure}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium block">Current Unit Valuation:</span>
                                <strong className="text-indigo-950 text-sm font-extrabold">Rs. {(adjustingStockItem.costPerUnit || 0).toFixed(2)}</strong>
                            </div>
                        </div>
                    )}

                    {/* Action Type */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Stock Movement Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setAdjustForm({ ...adjustForm, actionType: 'add' })}
                                className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all ${
                                    adjustForm.actionType === 'add'
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                                }`}
                            >
                                + Add Stock (In)
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdjustForm({ ...adjustForm, actionType: 'reduce' })}
                                className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all ${
                                    adjustForm.actionType === 'reduce'
                                        ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-600/20'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                                }`}
                            >
                                - Reduce (Out)
                            </button>
                            <button
                                type="button"
                                onClick={() => setAdjustForm({ ...adjustForm, actionType: 'opening' })}
                                className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all ${
                                    adjustForm.actionType === 'opening'
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
                                }`}
                            >
                                Opening Balance
                            </button>
                        </div>
                    </div>

                    {/* Quantity & Unit Cost */}
                    <div className="grid grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Quantity <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={adjustForm.quantity}
                                onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                                required
                                placeholder="0.00"
                                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                                Unit Cost (LKR)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rs.</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={adjustForm.costPerUnit}
                                    onChange={e => setAdjustForm({ ...adjustForm, costPerUnit: e.target.value })}
                                    placeholder="0.00"
                                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">Reason / Reference</label>
                        <select
                            value={adjustForm.reason}
                            onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 shadow-sm"
                        >
                            <option value="Direct Stock In / Opening Balance">Direct Stock In / Opening Balance</option>
                            <option value="Supplier Direct Purchase">Supplier Direct Purchase</option>
                            <option value="Physical Count Correction">Physical Count Correction</option>
                            <option value="Job Site Return / Unused Material">Job Site Return / Unused Material</option>
                            <option value="Damaged / Scrap Write-off">Damaged / Scrap Write-off</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setIsAdjustModalOpen(false)}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submittingAdjust}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                        >
                            <Save size={16} />
                            {submittingAdjust ? 'Updating...' : 'Post Quantity Movement'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
