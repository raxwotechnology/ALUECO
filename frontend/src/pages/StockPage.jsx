import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Boxes, AlertTriangle, PackagePlus, ArrowRightLeft, Settings2, History } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';

import { useStockItems } from '../features/stock/useStock';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useAuthStore } from '../store/authStore';

export default function StockPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canAdjust = ['admin', 'manager', 'warehouse_staff'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '', warehouseId: '', lowStock: '',
        page: 1, limit: 20,
    });

    const { data, isLoading } = useStockItems(filters);
    const { data: warehousesData } = useWarehouses();

    const items = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const warehouseOptions = (warehousesData?.data || []).map((w) => ({
        value: w._id, label: `${w.name} (${w.warehouseCode})`,
    }));

    const fmt = (n) => new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2 }).format(n || 0);
    const fmtMoney = (n) => new Intl.NumberFormat('en-LK', {
        style: 'currency', currency: 'LKR', minimumFractionDigits: 2,
    }).format(n || 0);

    const getStockStatus = (item) => {
        const onHand = item.quantities.onHand;
        const reorder = item.productId?.stockLevels?.reorderLevel || 0;
        const min = item.productId?.stockLevels?.minimumLevel || 0;

        if (onHand <= 0) return { variant: 'danger', label: 'Out of stock' };
        if (onHand <= min) return { variant: 'danger', label: 'Critical' };
        if (reorder && onHand <= reorder) return { variant: 'warning', label: 'Low' };
        return { variant: 'success', label: 'In stock' };
    };

    const totalValue = items.reduce((s, i) => s + (i.totalValue || 0), 0);
    const lowStockCount = items.filter(i => {
        const s = getStockStatus(i);
        return s.variant === 'danger' || s.variant === 'warning';
    }).length;

    return (
        <div>
            {/* ─── PAGE HEADER ─── */}
            <div className="mb-6">
                <div className="mb-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Stock Overview</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Current inventory across all warehouses</p>
                </div>

                {/* Action buttons — wrap on mobile */}
                {canAdjust && (
                    <div className="flex flex-wrap gap-2 mt-4">
                        <Button variant="outline" size="sm" onClick={() => navigate('/stock/opening')}>
                            <PackagePlus size={15} className="mr-1.5" /> Opening Stock
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate('/stock/transfer')}>
                            <ArrowRightLeft size={15} className="mr-1.5" /> Transfer
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate('/stock/adjustment')}>
                            <Settings2 size={15} className="mr-1.5" /> Adjust
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => navigate('/stock/movements')}>
                            History
                        </Button>
                    </div>
                )}
            </div>

            {/* ─── SUMMARY STRIP ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <Card className="p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Items</p>
                    <p className="text-2xl font-bold text-gray-800">{total}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-gray-500 mb-1">Page Value</p>
                    <p className="text-xl font-bold text-gray-800 truncate">{fmtMoney(totalValue)}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-gray-500 mb-1">Warehouses</p>
                    <p className="text-2xl font-bold text-gray-800">{warehouseOptions.length}</p>
                </Card>
                <Card className="p-4 bg-amber-50 border border-amber-200">
                    <p className="text-xs text-amber-600 flex items-center gap-1 mb-1">
                        <AlertTriangle size={12} /> Low / Critical
                    </p>
                    <button
                        className="text-2xl font-bold text-amber-700 hover:underline"
                        onClick={() => setFilters((f) => ({ ...f, lowStock: 'true', page: 1 }))}
                    >
                        {lowStockCount > 0 ? lowStockCount : 'View'}
                    </button>
                </Card>
            </div>

            {/* ─── FILTERS + TABLE ─── */}
            <Card>
                {/* Filter bar */}
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row flex-wrap gap-3">
                    <div className="relative flex-1 min-w-0">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search product..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-full sm:w-52">
                        <Select
                            placeholder="All Warehouses"
                            options={warehouseOptions}
                            value={filters.warehouseId}
                            onChange={(e) => setFilters((f) => ({ ...f, warehouseId: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-full sm:w-40">
                        <Select
                            placeholder="All Items"
                            options={[{ value: 'true', label: 'Low stock only' }]}
                            value={filters.lowStock}
                            onChange={(e) => setFilters((f) => ({ ...f, lowStock: e.target.value, page: 1 }))}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon={Boxes}
                        title="No stock data"
                        description="Enter opening stock to get started"
                        action={canAdjust && (
                            <Button variant="primary" onClick={() => navigate('/stock/opening')}>
                                <PackagePlus size={16} className="mr-1.5" /> Enter Opening Stock
                            </Button>
                        )}
                    />
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full min-w-[640px]">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Warehouse</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">On Hand</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Reserved</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Available</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Value</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((r) => {
                                        const s = getStockStatus(r);
                                        return (
                                            <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <p className="font-medium text-sm text-gray-800">{r.productName}</p>
                                                    <p className="text-xs font-mono text-gray-400">{r.productCode}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm text-gray-700">{r.warehouseId?.name}</p>
                                                    <p className="text-xs font-mono text-gray-400">{r.warehouseId?.warehouseCode}</p>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-800 whitespace-nowrap">
                                                    {fmt(r.quantities.onHand)} <span className="text-xs text-gray-400">{r.unitOfMeasure}</span>
                                                </td>
                                                <td className={`px-4 py-3 text-right text-sm whitespace-nowrap ${r.quantities.reserved > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                                                    {fmt(r.quantities.reserved)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-semibold text-green-700 whitespace-nowrap">
                                                    {fmt(r.quantities.onHand - r.quantities.reserved)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-600 whitespace-nowrap">
                                                    {fmtMoney(r.totalValue)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant={s.variant}>{s.label}</Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="sm:hidden divide-y divide-gray-100">
                            {items.map((r) => {
                                const s = getStockStatus(r);
                                const available = r.quantities.onHand - r.quantities.reserved;
                                return (
                                    <div key={r._id} className="px-4 py-4">
                                        {/* Header row */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-sm text-gray-800 truncate">{r.productName}</p>
                                                <p className="text-xs font-mono text-gray-400 mt-0.5">{r.productCode}</p>
                                            </div>
                                            <Badge variant={s.variant} className="ml-2 flex-shrink-0">{s.label}</Badge>
                                        </div>

                                        {/* Warehouse */}
                                        <p className="text-xs text-gray-500 mb-3">
                                            📦 {r.warehouseId?.name}
                                            {r.warehouseId?.warehouseCode && ` · ${r.warehouseId.warehouseCode}`}
                                        </p>

                                        {/* Quantities grid */}
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                <p className="text-gray-400 mb-0.5">On Hand</p>
                                                <p className="font-bold text-gray-800 text-sm">{fmt(r.quantities.onHand)}</p>
                                                <p className="text-gray-400">{r.unitOfMeasure}</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-lg p-2 text-center">
                                                <p className="text-amber-500 mb-0.5">Reserved</p>
                                                <p className={`font-bold text-sm ${r.quantities.reserved > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
                                                    {fmt(r.quantities.reserved)}
                                                </p>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-2 text-center">
                                                <p className="text-green-500 mb-0.5">Available</p>
                                                <p className="font-bold text-green-700 text-sm">{fmt(available)}</p>
                                            </div>
                                        </div>

                                        {/* Value */}
                                        <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-100">
                                            <span className="text-xs text-gray-400">Stock Value</span>
                                            <span className="text-sm font-semibold text-gray-700">{fmtMoney(r.totalValue)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Pagination
                            page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}
            </Card>
        </div>
    );
}