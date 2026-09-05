import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Check, Clock, Search, RefreshCw, Calendar, Eye, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import EmptyState from '../components/ui/EmptyState';
import { useAuthStore } from '../store/authStore';
import ProductAutocompleteSelect from '../components/ui/ProductAutocompleteSelect';

export default function FarmHarvestsPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'production_staff', 'procurement_staff'].includes(user?.role);

    const [harvests, setHarvests] = useState([]);
    const [farms, setFarms] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedHarvest, setSelectedHarvest] = useState(null);

    const [formData, setFormData] = useState({
        farmId: '',
        warehouseId: '',
        harvestDate: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'draft',
        items: []
    });

    const [newItem, setNewItem] = useState({
        productId: '',
        quantity: '',
        unitPrice: ''
    });

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [harvestRes, farmRes, whRes, prodRes] = await Promise.all([
                api.get('/farm-harvests'),
                api.get('/farms?status=active'),
                api.get('/warehouses'),
                api.get('/products')
            ]);
            setHarvests(harvestRes.data.data || []);
            setFarms(farmRes.data.data || []);
            setWarehouses(whRes.data.data || []);
            
            // Filter products of type raw_material
            const rawProds = (prodRes.data.data || []).filter(p => p.productType === 'raw_material');
            setProducts(rawProds);
        } catch (err) {
            toast.error('Failed to fetch harvest logs');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const openForm = () => {
        setFormData({
            farmId: farms[0]?._id || '',
            warehouseId: warehouses[0]?._id || '',
            harvestDate: new Date().toISOString().split('T')[0],
            notes: '',
            status: 'draft',
            items: []
        });
        setNewItem({ productId: '', quantity: '', unitPrice: '' });
        setIsFormOpen(true);
    };

    const handleAddItem = () => {
        if (!newItem.productId || !newItem.quantity || Number(newItem.quantity) <= 0) {
            toast.error('Please select a product and enter a valid quantity');
            return;
        }

        const selectedProd = products.find(p => p._id === newItem.productId);
        if (!selectedProd) return;

        // Check if item already added
        if (formData.items.some(item => item.productId === newItem.productId)) {
            toast.error('Product already added to list');
            return;
        }

        setFormData(p => ({
            ...p,
            items: [
                ...p.items,
                {
                    productId: newItem.productId,
                    productName: selectedProd.name,
                    productCode: selectedProd.productCode,
                    quantity: Number(newItem.quantity),
                    unitOfMeasure: selectedProd.unitOfMeasure,
                    unitPrice: Number(newItem.unitPrice) || selectedProd.basePrice || 0
                }
            ]
        }));

        setNewItem({ productId: '', quantity: '', unitPrice: '' });
    };

    const handleRemoveItem = (index) => {
        setFormData(p => ({
            ...p,
            items: p.items.filter((_, i) => i !== index)
        }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.farmId) return toast.error('Please select a farm');
        if (!formData.warehouseId) return toast.error('Please select a warehouse');
        if (formData.items.length === 0) return toast.error('Please add at least one crop item');

        try {
            await api.post('/farm-harvests', formData);
            toast.success('Farm harvest logged successfully');
            setIsFormOpen(false);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record harvest');
        }
    };

    const handleApprove = async (id) => {
        try {
            await api.post(`/farm-harvests/${id}/approve`);
            toast.success('✅ Harvest approved and stock increased successfully');
            setIsViewOpen(false);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Approval failed');
        }
    };

    const viewHarvest = (harvest) => {
        setSelectedHarvest(harvest);
        setIsViewOpen(true);
    };

    const columns = [
        { key: 'harvestNumber', label: 'Harvest No', render: (r) => <span className="font-bold text-gray-800">{r.harvestNumber}</span> },
        { key: 'farmName', label: 'Farm', render: (r) => r.farmName || r.farmId?.name || '—' },
        { key: 'warehouseName', label: 'Intake Warehouse', render: (r) => r.warehouseId?.name || '—' },
        { key: 'harvestDate', label: 'Harvest Date', render: (r) => new Date(r.harvestDate).toLocaleDateString() },
        {
            key: 'totalValue',
            label: 'Total Value',
            render: (r) => `Rs. ${(r.totalValue || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => (
                <Badge variant={r.status === 'approved' ? 'success' : 'default'}>
                    {r.status === 'approved' ? 'Approved & Stocked' : 'Draft'}
                </Badge>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (r) => (
                <div className="flex gap-2">
                    <button onClick={() => viewHarvest(r)} className="p-1 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded border border-gray-100 flex items-center gap-1 text-xs px-2 py-1">
                        <Eye size={14} /> View
                    </button>
                    {r.status === 'draft' && canManage && (
                        <button onClick={() => handleApprove(r._id)} className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-100 flex items-center gap-1 text-xs px-2 py-1">
                            <Check size={14} /> Approve
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Own Farm Harvests"
                description="Log and approve crop harvest yields from company-owned agricultural farms"
                actions={canManage && <Button variant="primary" onClick={openForm}><Plus size={16} className="mr-1.5" />Log Harvest</Button>}
            />

            <Card className="p-4">
                <div className="flex justify-end mb-4">
                    <button onClick={fetchAllData} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-gray-500">Loading harvest logs...</div>
                ) : harvests.length === 0 ? (
                    <EmptyState
                        icon={Calendar}
                        title="No harvests logged yet"
                        description="Log harvests from company farms to receive agricultural materials into inventory."
                        action={canManage && <Button variant="primary" onClick={openForm}><Plus size={16} className="mr-1.5" />Log Harvest</Button>}
                    />
                ) : (
                    <Table columns={columns} data={harvests} />
                )}
            </Card>

            {/* View Modal */}
            <Modal
                isOpen={isViewOpen}
                onClose={() => setIsViewOpen(false)}
                title={`Harvest Details: ${selectedHarvest?.harvestNumber}`}
                size="lg"
            >
                {selectedHarvest && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-sm border border-gray-150">
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Source Farm</span>
                                <span className="font-bold text-gray-800">{selectedHarvest.farmName || selectedHarvest.farmId?.name}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Intake Warehouse</span>
                                <span className="font-bold text-gray-800">{selectedHarvest.warehouseId?.name}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Harvest Date</span>
                                <span className="font-medium text-gray-800">{new Date(selectedHarvest.harvestDate).toLocaleDateString()}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Status</span>
                                <Badge variant={selectedHarvest.status === 'approved' ? 'success' : 'default'}>
                                    {selectedHarvest.status === 'approved' ? 'Approved & Stocked' : 'Draft'}
                                </Badge>
                            </div>
                            {selectedHarvest.notes && (
                                <div className="col-span-2 border-t border-gray-200 pt-2 mt-2">
                                    <span className="text-gray-500 block text-xs font-semibold uppercase">Notes</span>
                                    <p className="text-gray-750 text-xs italic">{selectedHarvest.notes}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-2">Harvested Crops</h4>
                            <div className="overflow-x-auto border border-gray-150 rounded-xl">
                                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase">
                                        <tr>
                                            <th className="px-4 py-3">Product</th>
                                            <th className="px-4 py-3">Code</th>
                                            <th className="px-4 py-3">Quantity</th>
                                            <th className="px-4 py-3">Estimated Price</th>
                                            <th className="px-4 py-3">Tracking Batch Code</th>
                                            <th className="px-4 py-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-150 text-gray-700">
                                        {selectedHarvest.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-semibold text-gray-900">{item.productName}</td>
                                                <td className="px-4 py-3 text-gray-500">{item.productCode}</td>
                                                <td className="px-4 py-3">{item.quantity} {item.unitOfMeasure}</td>
                                                <td className="px-4 py-3">Rs. {item.unitPrice.toFixed(2)}</td>
                                                <td className="px-4 py-3 font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded inline-block mt-1">{item.batchNumber || '—'}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">Rs. {(item.quantity * item.unitPrice).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200">
                                        <tr>
                                            <td colSpan="5" className="px-4 py-3 text-right uppercase text-xs tracking-wider">Grand Total:</td>
                                            <td className="px-4 py-3 text-right text-base text-emerald-600">Rs. {selectedHarvest.totalValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="default" onClick={() => setIsViewOpen(false)}>Close</Button>
                            {selectedHarvest.status === 'draft' && canManage && (
                                <Button type="button" variant="primary" onClick={() => handleApprove(selectedHarvest._id)}>
                                    <Check size={16} className="mr-1.5" /> Approve & Stock Intake
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* Create Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title="Log Own Farm Harvest"
                size="lg"
            >
                <form onSubmit={handleFormSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Source Farm *"
                            value={formData.farmId}
                            onChange={(e) => setFormData(p => ({ ...p, farmId: e.target.value }))}
                            required
                        >
                            {farms.map(f => (
                                <option key={f._id} value={f._id}>{f.name} ({f.farmCode})</option>
                            ))}
                        </Select>

                        <Select
                            label="Intake Warehouse *"
                            value={formData.warehouseId}
                            onChange={(e) => setFormData(p => ({ ...p, warehouseId: e.target.value }))}
                            required
                        >
                            {warehouses.map(w => (
                                <option key={w._id} value={w._id}>{w.name}</option>
                            ))}
                        </Select>

                        <Input
                            label="Harvest Date *"
                            type="date"
                            value={formData.harvestDate}
                            onChange={(e) => setFormData(p => ({ ...p, harvestDate: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="border border-gray-150 p-4 rounded-xl bg-gray-50 space-y-4">
                        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Add Harvested Crop</h4>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                            <div className="md:col-span-2">
                                <ProductAutocompleteSelect
                                    label="Product (Raw Material) *"
                                    placeholder="Type to search or add..."
                                    products={products}
                                    value={newItem.productId}
                                    productType="raw_material"
                                    onChange={(val, newProd) => {
                                        if (newProd) {
                                            setProducts(prev => {
                                                if (prev.some(p => p._id === newProd._id)) return prev;
                                                return [...prev, newProd];
                                            });
                                        }
                                        setNewItem(p => ({ ...p, productId: val }));
                                    }}
                                />
                            </div>
                            <Input
                                label="Harvest Qty (Kg/Nos) *"
                                type="number"
                                min="0.01"
                                step="any"
                                placeholder="0.00"
                                value={newItem.quantity}
                                onChange={(e) => setNewItem(p => ({ ...p, quantity: e.target.value }))}
                            />
                            <Input
                                label="Est. Unit Price (Optional)"
                                type="number"
                                min="0"
                                step="any"
                                placeholder="Base price"
                                value={newItem.unitPrice}
                                onChange={(e) => setNewItem(p => ({ ...p, unitPrice: e.target.value }))}
                            />
                            <div className="md:col-span-1 flex items-end">
                                <Button type="button" variant="primary" onClick={handleAddItem} className="w-full">
                                    Add Item
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-2">Selected Items</h4>
                        <div className="overflow-x-auto border border-gray-150 rounded-xl">
                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3">Qty</th>
                                        <th className="px-4 py-3">Est. Unit Price</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        <th className="px-4 py-3 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150 text-gray-700">
                                    {formData.items.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-8 text-center text-gray-400 italic">No crops added yet. Use the section above to add items.</td>
                                        </tr>
                                    ) : (
                                        formData.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-3 font-semibold text-gray-900">{item.productName}</td>
                                                <td className="px-4 py-3">{item.quantity} {item.unitOfMeasure}</td>
                                                <td className="px-4 py-3">Rs. {item.unitPrice.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">Rs. {(item.quantity * item.unitPrice).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <Textarea
                        label="Additional Notes"
                        placeholder="e.g. Good harvest condition. Moisture check pending."
                        value={formData.notes}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                        rows={3}
                    />

                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <Button type="button" variant="default" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Save as Draft</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
