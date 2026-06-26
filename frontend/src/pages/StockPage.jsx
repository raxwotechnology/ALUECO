import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Boxes, AlertTriangle, PackagePlus, ArrowRightLeft, Settings2, History, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import ConfirmDialog from '../components/ui/ConfirmDialog';

import { useStockItems, useReleaseStock, useUpdateStockItem, useDeleteStockItem } from '../features/stock/useStock';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';

export default function StockPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { hasPermission } = usePermission();
    const canAdjust = hasPermission('inventory.adjust') || ['super_admin', 'admin', 'manager', 'warehouse_manager', 'warehouse_staff'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '', warehouseId: '', lowStock: '',
        stockType: '', // 'open' or 'balance' or ''
        page: 1, limit: 20,
    });

    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [selectedItemForRelease, setSelectedItemForRelease] = useState(null);
    const [releaseQty, setReleaseQty] = useState('');
    const [releaseNotes, setReleaseNotes] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
    const [editFormData, setEditFormData] = useState({
        batchNumber: '',
        openStock: '',
        balanceStock: '',
        costPerUnit: '',
        expiryDate: '',
    });

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedItemForDelete, setSelectedItemForDelete] = useState(null);

    const { data, isLoading } = useStockItems(filters);
    const { data: warehousesData } = useWarehouses();
    const releaseMutation = useReleaseStock();
    const updateMutation = useUpdateStockItem();
    const deleteMutation = useDeleteStockItem();

    const handleOpenEditModal = (item) => {
        setSelectedItemForEdit(item);
        setEditFormData({
            batchNumber: item.batchNumber || '',
            openStock: item.quantities.openStock || 0,
            balanceStock: item.quantities.balanceStock || 0,
            costPerUnit: item.costPerUnit || 0,
            expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItemForEdit) return;
        try {
            await updateMutation.mutateAsync({
                id: selectedItemForEdit._id,
                data: {
                    batchNumber: editFormData.batchNumber,
                    openStock: Number(editFormData.openStock),
                    balanceStock: Number(editFormData.balanceStock),
                    costPerUnit: Number(editFormData.costPerUnit),
                    expiryDate: editFormData.expiryDate || null,
                }
            });
            setIsEditModalOpen(false);
        } catch (err) {}
    };

    const handleOpenDeleteConfirm = (item) => {
        setSelectedItemForDelete(item);
        setIsDeleteConfirmOpen(true);
    };

    const handleDeleteSubmit = async () => {
        if (!selectedItemForDelete) return;
        try {
            await deleteMutation.mutateAsync(selectedItemForDelete._id);
            setIsDeleteConfirmOpen(false);
        } catch (err) {}
    };

    const items = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const warehouseOptions = (warehousesData?.data || []).map((w) => ({
        value: w._id, label: `${w.name} (${w.warehouseCode})`,
    }));

    const handleOpenReleaseModal = (item) => {
        setSelectedItemForRelease(item);
        setReleaseQty('');
        setReleaseNotes('');
        setIsReleaseModalOpen(true);
    };

    const handleReleaseSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItemForRelease) return;
        if (!releaseQty || Number(releaseQty) <= 0) {
            return toast.error('Please enter a valid quantity');
        }
        if (Number(releaseQty) > selectedItemForRelease.quantities.balanceStock) {
            return toast.error(`Insufficient balance stock. Max available: ${selectedItemForRelease.quantities.balanceStock}`);
        }

        try {
            await releaseMutation.mutateAsync({
                productId: selectedItemForRelease.productId?._id,
                warehouseId: selectedItemForRelease.warehouseId?._id,
                batchNumber: selectedItemForRelease.batchNumber,
                quantity: Number(releaseQty),
                notes: releaseNotes
            });
            setIsReleaseModalOpen(false);
        } catch (err) {
            // Toast handled by mutation hook
        }
    };

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
                    <div className="w-full sm:w-44">
                        <Select
                            placeholder="All Stock Types"
                            options={[
                                { value: '', label: 'All Stock Types' },
                                { value: 'open', label: 'Open Stock only' },
                                { value: 'balance', label: 'Balance Stock only' }
                            ]}
                            value={filters.stockType}
                            onChange={(e) => setFilters((f) => ({ ...f, stockType: e.target.value, page: 1 }))}
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
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Open Stock (Avail / Res)</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance Stock</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Stock</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Value</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
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
                                                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                                    {r.batchNumber ? (
                                                        <Badge variant="warning">{r.batchNumber}</Badge>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">Standard</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-800 whitespace-nowrap">
                                                    <div>
                                                        <span>{fmt(r.quantities.openStock)}</span>{' '}
                                                        <span className="text-xs text-gray-400">{r.unitOfMeasure}</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                                        Avail: <span className="text-green-700 font-semibold">{fmt(Math.max(0, r.quantities.openStock - r.quantities.reserved))}</span>
                                                        {r.quantities.reserved > 0 && (
                                                            <> · Res: <span className="text-amber-600 font-medium">{fmt(r.quantities.reserved)}</span></>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-600 whitespace-nowrap">
                                                    {fmt(r.quantities.balanceStock)} <span className="text-xs text-gray-400">{r.unitOfMeasure}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800 whitespace-nowrap">
                                                    {fmt(r.quantities.onHand)} <span className="text-xs text-gray-400">{r.unitOfMeasure}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-600 whitespace-nowrap">
                                                    {fmtMoney(r.totalValue)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant={s.variant}>{s.label}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {canAdjust && (r.quantities.balanceStock || 0) > 0 && (
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={() => handleOpenReleaseModal(r)}
                                                            >
                                                                Release
                                                            </Button>
                                                        )}
                                                        {canAdjust && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleOpenEditModal(r)}
                                                                    className="p-1 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded border border-gray-100 flex items-center gap-1 text-xs px-2 py-1"
                                                                    title="Edit Stock Item"
                                                                >
                                                                    <Edit size={14} /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenDeleteConfirm(r)}
                                                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded border border-red-100 flex items-center gap-1 text-xs px-2 py-1"
                                                                    title="Delete Stock Item"
                                                                >
                                                                    <Trash2 size={14} /> Delete
                                                                </button>
                                                            </>
                                                        )}
                                                        {!canAdjust && <span className="text-xs text-gray-400">—</span>}
                                                    </div>
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
                                const available = Math.max(0, r.quantities.openStock - r.quantities.reserved);
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

                                        {/* Warehouse & Batch */}
                                        <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                                            <span>📦 {r.warehouseId?.name}{r.warehouseId?.warehouseCode && ` · ${r.warehouseId.warehouseCode}`}</span>
                                            <span>Batch: <span className="font-semibold text-gray-700">{r.batchNumber || "Standard"}</span></span>
                                        </div>

                                        {/* Quantities grid */}
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="bg-blue-50 rounded-lg p-2 text-center">
                                                <p className="text-blue-500 mb-0.5 font-medium">Open Stock</p>
                                                <p className="font-bold text-blue-950 text-sm">{fmt(r.quantities.openStock)}</p>
                                                <p className="text-[10px] text-blue-600">Avail: {fmt(available)}</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-lg p-2 text-center">
                                                <p className="text-amber-500 mb-0.5 font-medium">Balance Stock</p>
                                                <p className="font-bold text-amber-700 text-sm">{fmt(r.quantities.balanceStock)}</p>
                                                <p className="text-[10px] text-gray-400">{r.unitOfMeasure}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                <p className="text-gray-500 mb-0.5 font-medium">Total Stock</p>
                                                <p className="font-bold text-gray-800 text-sm">{fmt(r.quantities.onHand)}</p>
                                                <p className="text-[10px] text-gray-400">{r.unitOfMeasure}</p>
                                            </div>
                                        </div>

                                        {/* Mobile Release Action */}
                                        {canAdjust && (r.quantities.balanceStock || 0) > 0 && (
                                            <div className="mt-3">
                                                <Button
                                                    fullWidth
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenReleaseModal(r)}
                                                >
                                                    Release Stock to POS
                                                </Button>
                                            </div>
                                        )}

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

                        {/* Release Stock Modal */}
                        <Modal
                            isOpen={isReleaseModalOpen}
                            onClose={() => setIsReleaseModalOpen(false)}
                            title="Release Stock to POS"
                            size="md"
                        >
                            <form onSubmit={handleReleaseSubmit} className="space-y-4">
                                {selectedItemForRelease && (
                                    <>
                                        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                                            <p>
                                                <span className="text-gray-500">Product:</span>{' '}
                                                <span className="font-semibold text-gray-800">
                                                    {selectedItemForRelease.productName}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Warehouse:</span>{' '}
                                                <span className="text-gray-700">
                                                    {selectedItemForRelease.warehouseId?.name}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Batch Code:</span>{' '}
                                                <span className="font-mono text-gray-700">
                                                    {selectedItemForRelease.batchNumber || 'Standard'}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Current Balance Stock:</span>{' '}
                                                <span className="font-bold text-amber-700">
                                                    {fmt(selectedItemForRelease.quantities.balanceStock)} {selectedItemForRelease.unitOfMeasure}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Current Open Stock:</span>{' '}
                                                <span className="font-bold text-blue-700">
                                                    {fmt(selectedItemForRelease.quantities.openStock)} {selectedItemForRelease.unitOfMeasure}
                                                </span>
                                            </p>
                                        </div>

                                        <Input
                                            label={`Quantity to Release (${selectedItemForRelease.unitOfMeasure})`}
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max={selectedItemForRelease.quantities.balanceStock}
                                            value={releaseQty}
                                            onChange={(e) => setReleaseQty(e.target.value)}
                                            placeholder="Enter quantity to release"
                                            required
                                        />

                                        <Textarea
                                            label="Notes"
                                            value={releaseNotes}
                                            onChange={(e) => setReleaseNotes(e.target.value)}
                                            placeholder="Optional notes..."
                                            rows={3}
                                        />

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button variant="outline" type="button" onClick={() => setIsReleaseModalOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button variant="primary" type="submit" loading={releaseMutation.isLoading}>
                                                Confirm Release
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </form>
                        </Modal>

                        {/* Edit Stock Modal */}
                        <Modal
                            isOpen={isEditModalOpen}
                            onClose={() => setIsEditModalOpen(false)}
                            title="Edit Stock Item"
                            size="md"
                        >
                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                {selectedItemForEdit && (
                                    <>
                                        <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
                                            <p><span className="text-gray-500">Product:</span> <span className="font-semibold text-gray-800">{selectedItemForEdit.productName}</span></p>
                                            <p><span className="text-gray-500">Warehouse:</span> <span className="text-gray-700">{selectedItemForEdit.warehouseId?.name}</span></p>
                                        </div>

                                        <Input
                                            label="Batch Code"
                                            value={editFormData.batchNumber}
                                            onChange={(e) => setEditFormData(p => ({ ...p, batchNumber: e.target.value }))}
                                            placeholder="Standard/Batch code"
                                        />

                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                label={`Open Stock (${selectedItemForEdit.unitOfMeasure})`}
                                                type="number"
                                                step="any"
                                                value={editFormData.openStock}
                                                onChange={(e) => setEditFormData(p => ({ ...p, openStock: e.target.value }))}
                                                required
                                            />
                                            <Input
                                                label={`Balance Stock (${selectedItemForEdit.unitOfMeasure})`}
                                                type="number"
                                                step="any"
                                                value={editFormData.balanceStock}
                                                onChange={(e) => setEditFormData(p => ({ ...p, balanceStock: e.target.value }))}
                                                required
                                            />
                                        </div>

                                        <Input
                                            label="Cost per Unit (LKR)"
                                            type="number"
                                            step="0.01"
                                            value={editFormData.costPerUnit}
                                            onChange={(e) => setEditFormData(p => ({ ...p, costPerUnit: e.target.value }))}
                                            required
                                        />

                                        <Input
                                            label="Expiry Date"
                                            type="date"
                                            value={editFormData.expiryDate}
                                            onChange={(e) => setEditFormData(p => ({ ...p, expiryDate: e.target.value }))}
                                        />

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button variant="primary" type="submit" loading={updateMutation.isLoading}>
                                                Save Changes
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </form>
                        </Modal>

                        {/* Delete Confirm Dialog */}
                        <ConfirmDialog
                            isOpen={isDeleteConfirmOpen}
                            onClose={() => setIsDeleteConfirmOpen(false)}
                            onConfirm={handleDeleteSubmit}
                            title="Delete Stock Item"
                            message={`Are you sure you want to delete this stock item record for "${selectedItemForDelete?.productName}"? This action cannot be undone.`}
                            confirmText="Delete"
                            variant="danger"
                            loading={deleteMutation.isLoading}
                        />
                    </>
                )}
            </Card>
        </div>
    );
}