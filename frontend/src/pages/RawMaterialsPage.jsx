import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Search, Boxes, AlertTriangle, RefreshCw } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';

export default function RawMaterialsPage() {
    const [stockItems, setStockItems] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [stockRes, whRes] = await Promise.all([
                api.get('/stock?limit=250'),
                api.get('/warehouses')
            ]);
            
            // Filter only raw materials
            const rawItems = (stockRes.data.data || []).filter(item => {
                return item.productId?.type === 'raw_material';
            });

            setStockItems(rawItems);
            setWarehouses(whRes.data.data || []);
        } catch (err) {
            toast.error('Failed to load raw material inventory');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const getStockStatus = (item) => {
        const onHand = item.quantities?.onHand || 0;
        const reorder = item.productId?.stockLevels?.reorderLevel || 0;
        const min = item.productId?.stockLevels?.minimumLevel || 0;

        if (onHand <= 0) return { variant: 'danger', label: 'Out of stock' };
        if (onHand <= min) return { variant: 'danger', label: 'Critical' };
        if (reorder && onHand <= reorder) return { variant: 'warning', label: 'Low' };
        return { variant: 'success', label: 'In stock' };
    };

    // Filter items locally for responsive search/filter feel
    const filteredItems = stockItems.filter(item => {
        const matchesSearch = 
            item.productName?.toLowerCase().includes(search.toLowerCase()) || 
            item.productCode?.toLowerCase().includes(search.toLowerCase()) ||
            (item.batchNumber && item.batchNumber.toLowerCase().includes(search.toLowerCase()));

        const matchesWarehouse = !warehouseFilter || item.warehouseId?._id === warehouseFilter;

        const statusInfo = getStockStatus(item);
        const matchesStatus = !statusFilter || 
            (statusFilter === 'low' && (statusInfo.variant === 'warning' || statusInfo.variant === 'danger')) ||
            (statusFilter === 'in_stock' && statusInfo.variant === 'success') ||
            (statusFilter === 'out_of_stock' && item.quantities?.onHand <= 0);

        return matchesSearch && matchesWarehouse && matchesStatus;
    });

    const totalWeight = filteredItems.reduce((sum, item) => sum + (item.quantities?.onHand || 0), 0);
    const totalValue = filteredItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    const lowStockCount = filteredItems.filter(item => {
        const s = getStockStatus(item);
        return s.variant === 'danger' || s.variant === 'warning';
    }).length;

    const columns = [
        { 
            key: 'productName', 
            label: 'Material Name', 
            render: (r) => (
                <div>
                    <span className="font-bold text-gray-900 block">{r.productName}</span>
                    <span className="text-gray-500 text-xs font-mono">{r.productCode}</span>
                </div>
            ) 
        },
        { key: 'warehouse', label: 'Warehouse', render: (r) => r.warehouseId?.name || '—' },
        { 
            key: 'batchNumber', 
            label: 'Batch / Lot No', 
            render: (r) => r.batchNumber ? (
                <span className="font-mono text-xs font-bold bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {r.batchNumber}
                </span>
            ) : (
                <span className="text-gray-400 italic text-xs">Standard Stock</span>
            ) 
        },
        { 
            key: 'onHand', 
            label: 'On Hand', 
            render: (r) => <span className="font-bold text-gray-800">{r.quantities?.onHand} {r.unitOfMeasure}</span> 
        },
        { 
            key: 'available', 
            label: 'Available', 
            render: (r) => <span className="font-medium text-gray-700">{r.quantities?.available} {r.unitOfMeasure}</span> 
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
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Raw Materials Inventory"
                description="Monitor stocks, values, and batches of raw agricultural products"
            />

            {/* Stats strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="p-4 flex flex-col justify-between">
                    <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase block mb-1">Total Stock Weight</span>
                        <span className="text-2xl font-extrabold text-gray-900">{totalWeight.toLocaleString()} Kg</span>
                    </div>
                </Card>
                <Card className="p-4 flex flex-col justify-between">
                    <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase block mb-1">Total Stock Value</span>
                        <span className="text-2xl font-extrabold text-emerald-600">Rs. {totalValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                    </div>
                </Card>
                <Card className="p-4 flex flex-col justify-between">
                    <div>
                        <span className="text-gray-500 text-xs font-semibold uppercase block mb-1">Under-Stocked Materials</span>
                        <span className={`text-2xl font-extrabold ${lowStockCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{lowStockCount} Items</span>
                    </div>
                </Card>
            </div>

            <Card className="p-4">
                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-150 w-full sm:w-80">
                        <Search size={16} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by material, code or batch..."
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

                        <button onClick={fetchAllData} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                            <RefreshCw size={16} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-gray-500">Loading raw material levels...</div>
                ) : filteredItems.length === 0 ? (
                    <EmptyState
                        icon={Boxes}
                        title="No raw materials in inventory"
                        description="Record a Goods Receipt Note (GRN) or Farm Harvest to receive raw materials into stock."
                    />
                ) : (
                    <Table columns={columns} data={filteredItems} />
                )}
            </Card>
        </div>
    );
}
