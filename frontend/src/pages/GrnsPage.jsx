import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Plus, Check, Clock, Search, RefreshCw, FileText, Eye, CheckCircle2, AlertTriangle, Building, Home, Trash2 } from 'lucide-react';
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

export default function GrnsPage() {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'procurement_staff', 'production_staff'].includes(user?.role);

    const [grns, setGrns] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [farms, setFarms] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isQcOpen, setIsQcOpen] = useState(false);
    const [selectedGrn, setSelectedGrn] = useState(null);

    const [formData, setFormData] = useState({
        purchaseOrderId: '',
        warehouseId: '',
        sourceType: 'supplier',
        supplierId: '',
        farmId: '',
        receiptDate: new Date().toISOString().split('T')[0],
        supplierDeliveryNoteNumber: '',
        supplierInvoiceNumber: '',
        vehicleNumber: '',
        driverName: '',
        transportCompany: '',
        notes: '',
        items: []
    });

    const [newItem, setNewItem] = useState({
        productId: '',
        receivedQuantity: '',
        unitPrice: ''
    });

    // QC/QA inspection state
    const [qcApprovals, setQcApprovals] = useState([]);
    const [paidAmountLKR, setPaidAmountLKR] = useState('');
    const [bankAccounts, setBankAccounts] = useState([]);
    const [paymentType, setPaymentType] = useState('credit');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [bankAccountId, setBankAccountId] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [chequeNumber, setChequeNumber] = useState('');
    const [chequeDate, setChequeDate] = useState('');
    const [bankName, setBankName] = useState('');
    const [chequeStatus, setChequeStatus] = useState('pending');

    useEffect(() => {
        if (!bankAccountId && bankAccounts.length > 0) {
            const def = bankAccounts.find(a => a.isActive) || bankAccounts[0];
            if (def) setBankAccountId(def._id);
        }
    }, [bankAccounts, bankAccountId]);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [grnRes, supRes, farmRes, whRes, prodRes, poRes, bankRes] = await Promise.all([
                api.get('/grns', { params: { startDate: '', endDate: '' } }), // Bypass global date filter
                api.get('/suppliers'),
                api.get('/farms?status=active'),
                api.get('/warehouses'),
                api.get('/products'),
                api.get('/purchase-orders?status=approved,sent,partially_received'),
                api.get('/finance/bank-accounts')
            ]);
            setGrns(grnRes.data.data || []);
            setSuppliers(supRes.data.data || []);
            setFarms(farmRes.data.data || []);
            setWarehouses(whRes.data.data || []);
            setProducts(prodRes.data.data || []);
            setPurchaseOrders(poRes.data.data || []);
            setBankAccounts(bankRes.data.data || []);
        } catch (err) {
            toast.error('Failed to load material receipts (GRNs)');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const openForm = () => {
        setFormData({
            purchaseOrderId: '',
            warehouseId: warehouses[0]?._id || '',
            sourceType: 'supplier',
            supplierId: suppliers[0]?._id || '',
            farmId: farms[0]?._id || '',
            receiptDate: new Date().toISOString().split('T')[0],
            supplierDeliveryNoteNumber: '',
            supplierInvoiceNumber: '',
            vehicleNumber: '',
            driverName: '',
            transportCompany: '',
            notes: '',
            items: []
        });
        setNewItem({ productId: '', receivedQuantity: '', unitPrice: '' });
        setIsFormOpen(true);
    };

    // When PO is selected, auto-populate details
    const handlePoChange = (poId) => {
        if (!poId) {
            setFormData(p => ({
                ...p,
                purchaseOrderId: '',
                items: []
            }));
            return;
        }

        const selectedPo = purchaseOrders.find(po => po._id === poId);
        if (!selectedPo) return;

        setFormData(p => ({
            ...p,
            purchaseOrderId: poId,
            sourceType: 'supplier',
            supplierId: selectedPo.supplierId?._id || selectedPo.supplierId || '',
            items: selectedPo.items.map(item => ({
                poLineItemId: item._id,
                productId: item.productId?._id || item.productId,
                productName: item.productName || item.productId?.name,
                productCode: item.productCode || item.productId?.productCode,
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: item.orderedQuantity - (item.receivedQuantity || 0),
                unitOfMeasure: item.unitOfMeasure,
                unitPrice: item.unitPrice
            }))
        }));
    };

    const handleAddItem = () => {
        if (!newItem.productId || !newItem.receivedQuantity || Number(newItem.receivedQuantity) <= 0) {
            toast.error('Please select a product and enter a valid quantity');
            return;
        }

        const selectedProd = products.find(p => p._id === newItem.productId);
        if (!selectedProd) return;

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
                    receivedQuantity: Number(newItem.receivedQuantity),
                    unitOfMeasure: selectedProd.unitOfMeasure,
                    unitPrice: Number(newItem.unitPrice) || selectedProd.basePrice || 0
                }
            ]
        }));

        setNewItem({ productId: '', receivedQuantity: '', unitPrice: '' });
    };

    const handleRemoveItem = (index) => {
        setFormData(p => ({
            ...p,
            items: p.items.filter((_, i) => i !== index)
        }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        if (!formData.warehouseId) return toast.error('Please select a warehouse');
        if (formData.sourceType === 'supplier' && !formData.supplierId) return toast.error('Please select a supplier');
        if (formData.sourceType === 'own_farm' && !formData.farmId) return toast.error('Please select a farm');
        if (formData.items.length === 0) return toast.error('Please add at least one line item');

        const payload = { ...formData };
        if (!payload.purchaseOrderId) {
            delete payload.purchaseOrderId;
        }
        if (payload.sourceType === 'supplier') {
            delete payload.farmId;
            if (!payload.supplierId) delete payload.supplierId;
        } else if (payload.sourceType === 'own_farm') {
            delete payload.supplierId;
            if (!payload.farmId) delete payload.farmId;
        }

        try {
            await api.post('/grns', payload);
            toast.success('Goods Receipt Note recorded in pending QA approval queue');
            setIsFormOpen(false);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record material receipt');
        }
    };

    const viewGrn = (grn) => {
        setSelectedGrn(grn);
        setIsViewOpen(true);
    };

    const openQcModal = (grn) => {
        setSelectedGrn(grn);
        setPaidAmountLKR('');
        setPaymentType('credit');
        setPaymentMethod('cash');
        setPaymentReference('');
        setChequeNumber('');
        setChequeDate('');
        setBankName('');
        setChequeStatus('pending');
        // Initialize QC approvals list
        const initialApprovals = grn.items.map(item => ({
            _id: item._id,
            productName: item.productName,
            receivedQuantity: item.receivedQuantity,
            acceptedQuantity: item.receivedQuantity,
            rejectedQuantity: 0,
            rejectionReason: '',
            batchNumber: ''
        }));
        setQcApprovals(initialApprovals);
        setIsQcOpen(true);
    };

    const handleQcQtyChange = (idx, field, value) => {
        const val = Number(value) || 0;
        setQcApprovals(p => {
            const updated = [...p];
            const item = updated[idx];
            
            if (field === 'acceptedQuantity') {
                item.acceptedQuantity = Math.min(val, item.receivedQuantity);
                item.rejectedQuantity = item.receivedQuantity - item.acceptedQuantity;
            } else if (field === 'rejectedQuantity') {
                item.rejectedQuantity = Math.min(val, item.receivedQuantity);
                item.acceptedQuantity = item.receivedQuantity - item.rejectedQuantity;
            }
            return updated;
        });
    };

    const handleQcTextChange = (idx, field, value) => {
        setQcApprovals(p => {
            const updated = [...p];
            updated[idx][field] = value;
            return updated;
        });
    };

    const handleQcSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/grns/${selectedGrn._id}/approve`, {
                items: qcApprovals,
                paidAmountLKR: Number(paidAmountLKR) || 0,
                paymentType,
                paymentMethod,
                bankAccountId: paymentType === 'paid' ? bankAccountId : undefined,
                paymentReference: paymentType === 'paid' && (paymentMethod === 'card' || paymentMethod === 'bank_transfer') ? paymentReference : undefined,
                chequeNumber: paymentType === 'paid' && paymentMethod === 'cheque' ? chequeNumber : undefined,
                chequeDate: paymentType === 'paid' && paymentMethod === 'cheque' ? chequeDate : undefined,
                bankName: paymentType === 'paid' && paymentMethod === 'cheque' ? bankName : undefined,
                chequeStatus: paymentType === 'paid' && paymentMethod === 'cheque' ? chequeStatus : undefined,
            });
            toast.success('✅ QA Inspection approved, stock and supplier balances updated!');
            setIsQcOpen(false);
            setIsViewOpen(false);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'QA approval failed');
        }
    };

    const columns = [
        { key: 'grnNumber', label: 'GRN No', render: (r) => <span className="font-bold text-gray-800">{r.grnNumber}</span> },
        { key: 'source', label: 'Source', render: (r) => r.sourceType === 'own_farm' ? <span className="flex items-center gap-1 text-green-700 font-semibold"><Home size={14} /> Own Farm</span> : <span className="flex items-center gap-1 text-blue-700 font-semibold"><Building size={14} /> Supplier</span> },
        { key: 'sourceName', label: 'Source Name', hideOnMobile: true, render: (r) => r.sourceType === 'own_farm' ? r.farmName || r.farmId?.name || '—' : r.supplierName || r.supplierId?.displayName || '—' },
        { key: 'poNumber', label: 'PO Ref', hideOnMobile: true, render: (r) => r.poNumber ? <Badge variant="default">{r.poNumber}</Badge> : <span className="text-gray-400 italic">Direct Receipt</span> },
        { key: 'receiptDate', label: 'Receipt Date', hideOnMobile: true, render: (r) => new Date(r.receiptDate).toLocaleDateString() },
        {
            key: 'status',
            label: 'Status',
            render: (r) => (
                <Badge variant={r.status === 'approved' ? 'success' : r.status === 'pending_approval' ? 'warning' : 'default'}>
                    {r.status === 'approved' ? 'QA Approved' : r.status === 'pending_approval' ? 'Pending QA' : r.status}
                </Badge>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (r) => (
                <div className="flex gap-2">
                    <button onClick={() => viewGrn(r)} className="p-1 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded border border-gray-100 flex items-center gap-1 text-xs px-2 py-1">
                        <Eye size={14} /> View
                    </button>
                    {r.status === 'pending_approval' && canManage && (
                        <button onClick={() => openQcModal(r)} className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded border border-amber-100 flex items-center gap-1 text-xs px-2 py-1">
                            <CheckCircle2 size={14} /> QA Check
                        </button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Material Receipts (GRN)"
                description="Record materials intake from suppliers or company farms, and perform quality checks"
                actions={canManage && <Button variant="primary" onClick={openForm}><Plus size={16} className="mr-1.5" />New GRN</Button>}
            />

            <Card className="p-4">
                <div className="flex justify-end mb-4">
                    <button onClick={fetchAllData} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                        <RefreshCw size={16} className="text-gray-500" />
                    </button>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-gray-500">Loading GRN records...</div>
                ) : grns.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="No GRN records"
                        description="Log goods receipt notes to record stock intakes from farms or suppliers."
                        action={canManage && <Button variant="primary" onClick={openForm}><Plus size={16} className="mr-1.5" />New GRN</Button>}
                    />
                ) : (
                    <Table columns={columns} data={grns} />
                )}
            </Card>

            {/* View GRN Details Modal */}
            <Modal
                isOpen={isViewOpen}
                onClose={() => setIsViewOpen(false)}
                title={`GRN Details: ${selectedGrn?.grnNumber}`}
                size="lg"
            >
                {selectedGrn && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl text-sm border border-gray-150">
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Source Type</span>
                                <span className="font-bold text-gray-800 uppercase">{selectedGrn.sourceType}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Source Name</span>
                                <span className="font-bold text-gray-800">{selectedGrn.sourceType === 'own_farm' ? (selectedGrn.farmName || selectedGrn.farmId?.name) : (selectedGrn.supplierName || selectedGrn.supplierId?.displayName)}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Warehouse</span>
                                <span className="font-bold text-gray-800">{selectedGrn.warehouseId?.name}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Status</span>
                                <Badge variant={selectedGrn.status === 'approved' ? 'success' : selectedGrn.status === 'pending_approval' ? 'warning' : 'default'}>
                                    {selectedGrn.status === 'approved' ? 'QA Approved' : selectedGrn.status === 'pending_approval' ? 'Pending QA' : selectedGrn.status}
                                </Badge>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Receipt Date</span>
                                <span className="font-medium text-gray-800">{new Date(selectedGrn.receiptDate).toLocaleDateString()}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">PO Reference</span>
                                <span className="font-medium text-gray-800">{selectedGrn.poNumber || 'Direct GRN'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Delivery Note</span>
                                <span className="font-medium text-gray-800">{selectedGrn.supplierDeliveryNoteNumber || '—'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Invoice Ref</span>
                                <span className="font-medium text-gray-800">{selectedGrn.supplierInvoiceNumber || '—'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Vehicle No</span>
                                <span className="font-medium text-gray-800">{selectedGrn.vehicleNumber || '—'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Driver Name</span>
                                <span className="font-medium text-gray-800">{selectedGrn.driverName || '—'}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Transport Co.</span>
                                <span className="font-medium text-gray-800">{selectedGrn.transportCompany || '—'}</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-2">Received Items</h4>
                            <div className="overflow-x-auto border border-gray-150 rounded-xl">
                                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase">
                                        <tr>
                                            <th className="px-4 py-3">Product</th>
                                            <th className="px-4 py-3">Received Qty</th>
                                            <th className="px-4 py-3">QA Accepted</th>
                                            <th className="px-4 py-3">QA Rejected</th>
                                            <th className="px-4 py-3">Batch code</th>
                                            <th className="px-4 py-3 text-right">Unit Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-150 text-gray-700">
                                        {selectedGrn.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-semibold text-gray-900">{item.productName}</td>
                                                <td className="px-4 py-3 font-bold text-gray-700">{item.receivedQuantity} {item.unitOfMeasure}</td>
                                                <td className="px-4 py-3 text-emerald-600 font-bold">{item.acceptedQuantity || 0} {item.unitOfMeasure}</td>
                                                <td className="px-4 py-3 text-red-500 font-bold">{item.rejectedQuantity || 0} {item.unitOfMeasure}</td>
                                                <td className="px-4 py-3 font-mono text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded inline-block mt-1">{item.batchNumber || '—'}</td>
                                                <td className="px-4 py-3 text-right">Rs. {item.unitPrice?.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {selectedGrn.status === 'approved' && (
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 text-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <span className="text-gray-500 block text-xs">Total Value (LKR)</span>
                                    <span className="font-bold text-gray-900 text-lg">Rs. {selectedGrn.totalPayableLKR?.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs font-bold text-emerald-600">Paid Amount (LKR)</span>
                                    <span className="font-bold text-emerald-600 text-lg">Rs. {selectedGrn.paidAmountLKR?.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block text-xs font-bold text-amber-700">Balance Due (LKR)</span>
                                    <span className="font-bold text-amber-700 text-lg">Rs. {selectedGrn.balanceDueLKR?.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="default" onClick={() => setIsViewOpen(false)}>Close</Button>
                            {selectedGrn.status === 'pending_approval' && canManage && (
                                <Button type="button" variant="primary" onClick={() => openQcModal(selectedGrn)}>
                                    <CheckCircle2 size={16} className="mr-1.5" /> Perform QA Check
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* QA Inspection Modal */}
            <Modal
                isOpen={isQcOpen}
                onClose={() => setIsQcOpen(false)}
                title={`QA Quality Inspection: ${selectedGrn?.grnNumber}`}
                size="lg"
            >
                <form onSubmit={handleQcSubmit} className="space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex gap-2">
                        <AlertTriangle size={18} className="shrink-0" />
                        <div>
                            <span className="font-bold block">Quality Assurance Gate</span>
                            Review received weights/counts. Rejected quantities will not enter active warehouse inventory. Julian batch codes will be auto-generated.
                        </div>
                    </div>

                    <div className="space-y-4">
                        {qcApprovals.map((item, idx) => (
                            <div key={item._id} className="border border-gray-200 p-4 rounded-xl space-y-3 bg-white shadow-sm">
                                <h5 className="font-bold text-gray-800 text-sm">{item.productName}</h5>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <span className="text-gray-500 block mb-1">Received Quantity</span>
                                        <span className="font-bold text-gray-800 text-sm block py-1">{item.receivedQuantity}</span>
                                    </div>
                                    <div>
                                        <label className="text-gray-600 block mb-1 font-semibold">Accepted Qty</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={item.acceptedQuantity}
                                            onChange={(e) => handleQcQtyChange(idx, 'acceptedQuantity', e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-600 block mb-1 font-semibold">Rejected Qty</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={item.rejectedQuantity}
                                            onChange={(e) => handleQcQtyChange(idx, 'rejectedQuantity', e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 outline-none text-red-600 font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-gray-600 block mb-1 font-semibold">Custom Batch Code (Optional)</label>
                                        <input
                                            type="text"
                                            placeholder="Auto-Julian code"
                                            value={item.batchNumber}
                                            onChange={(e) => handleQcTextChange(idx, 'batchNumber', e.target.value)}
                                            className="w-full px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 outline-none font-mono uppercase"
                                        />
                                    </div>
                                </div>
                                {item.rejectedQuantity > 0 && (
                                    <div>
                                        <label className="text-gray-600 block mb-1 text-xs font-semibold">Rejection Reason *</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Moisture level too high, visible mold"
                                            value={item.rejectionReason}
                                            onChange={(e) => handleQcTextChange(idx, 'rejectionReason', e.target.value)}
                                            required
                                            className="w-full px-3 py-1.5 border border-red-200 focus:border-red-500 rounded text-xs outline-none"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-600 block">Payment Type</label>
                            <select
                                value={paymentType}
                                onChange={(e) => setPaymentType(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                            >
                                <option value="credit">On Credit (Generate Bill)</option>
                                <option value="paid">Paid Instantly</option>
                            </select>
                        </div>

                        {paymentType === 'paid' && (
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <Input
                                    label="Paid Amount (LKR) *"
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    placeholder="0.00"
                                    value={paidAmountLKR}
                                    onChange={(e) => setPaidAmountLKR(e.target.value)}
                                    required
                                />

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-600 block">Payment Method</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cheque">Cheque</option>
                                    </select>
                                </div>

                                {paymentMethod !== 'cash' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-600 block">Company Bank/Cash Account *</label>
                                        <select
                                            value={bankAccountId}
                                            onChange={(e) => setBankAccountId(e.target.value)}
                                            required
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                                        >
                                            <option value="">-- Select Bank Account --</option>
                                            {bankAccounts.map((acc) => (
                                                <option key={acc._id} value={acc._id}>
                                                    {acc.bankName} - {acc.accountNumber} ({acc.accountName})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {paymentMethod === 'bank_transfer' && (
                                    <Input
                                        label="Transaction Reference Number"
                                        type="text"
                                        placeholder="Enter bank reference number"
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                    />
                                )}

                                {paymentMethod === 'cheque' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-lg border">
                                        <div className="col-span-1">
                                            <Input
                                                label="Cheque Number *"
                                                type="text"
                                                required
                                                value={chequeNumber}
                                                onChange={(e) => setChequeNumber(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Input
                                                label="Bank Name *"
                                                type="text"
                                                required
                                                value={bankName}
                                                onChange={(e) => setBankName(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-1">
                                            <Input
                                                label="Cheque Date *"
                                                type="date"
                                                required
                                                value={chequeDate}
                                                onChange={(e) => setChequeDate(e.target.value)}
                                            />
                                        </div>
                                        <div className="col-span-1 space-y-1">
                                            <label className="text-xs font-bold text-gray-500 block">Cheque Status</label>
                                            <select
                                                value={chequeStatus}
                                                onChange={(e) => setChequeStatus(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="cleared">Cleared</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button type="button" variant="default" onClick={() => setIsQcOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Approve QA & Save Intake</Button>
                    </div>
                </form>
            </Modal>

            {/* Create GRN Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title="Create Goods Receipt Note (GRN)"
                size="lg"
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-600 block mb-1">Receipt Type</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    type="button"
                                    onClick={() => handlePoChange('')}
                                    className={`flex-1 py-2 text-sm font-semibold rounded-lg border transition ${!formData.purchaseOrderId ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    Direct GRN (No PO)
                                </button>
                                <select
                                    value={formData.purchaseOrderId}
                                    onChange={(e) => handlePoChange(e.target.value)}
                                    className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none bg-white font-medium transition ${formData.purchaseOrderId ? 'border-primary-500 text-primary-600 font-bold focus:ring-2 focus:ring-primary-200' : 'border-gray-300 text-gray-600 focus:ring-2 focus:ring-primary-200'}`}
                                >
                                    <option value="">Receive against PO</option>
                                    {purchaseOrders.map(po => (
                                        <option key={po._id} value={po._id}>{po.poNumber}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <Input
                            label="Receipt Date *"
                            type="date"
                            value={formData.receiptDate}
                            onChange={(e) => setFormData(p => ({ ...p, receiptDate: e.target.value }))}
                            required
                        />
                    </div>

                    {!formData.purchaseOrderId && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Select
                                label="Material Source Type *"
                                value={formData.sourceType}
                                onChange={(e) => setFormData(p => ({ ...p, sourceType: e.target.value }))}
                                required
                            >
                                <option value="supplier">Supplier</option>
                                <option value="own_farm">Own Farm</option>
                            </Select>

                            {formData.sourceType === 'supplier' ? (
                                <Select
                                    label="Supplier *"
                                    value={formData.supplierId}
                                    onChange={(e) => setFormData(p => ({ ...p, supplierId: e.target.value }))}
                                    required
                                    placeholder="Select Supplier"
                                >
                                    {suppliers.map(s => (
                                        <option key={s._id} value={s._id}>{s.displayName || s.companyName}</option>
                                    ))}
                                </Select>
                            ) : (
                                <Select
                                    label="Source Farm *"
                                    value={formData.farmId}
                                    onChange={(e) => setFormData(p => ({ ...p, farmId: e.target.value }))}
                                    required
                                    placeholder="Select Farm"
                                >
                                    {farms.map(f => (
                                        <option key={f._id} value={f._id}>{f.name} ({f.farmCode})</option>
                                    ))}
                                </Select>
                            )}

                            <Select
                                label="Intake Warehouse *"
                                value={formData.warehouseId}
                                onChange={(e) => setFormData(p => ({ ...p, warehouseId: e.target.value }))}
                                required
                                placeholder="Select Warehouse"
                            >
                                {warehouses.map(w => (
                                    <option key={w._id} value={w._id}>{w.name}</option>
                                ))}
                            </Select>
                        </div>
                    )}

                    {formData.purchaseOrderId && (
                        <Select
                            label="Intake Warehouse *"
                            value={formData.warehouseId}
                            onChange={(e) => setFormData(p => ({ ...p, warehouseId: e.target.value }))}
                            required
                            placeholder="Select Warehouse"
                        >
                            {warehouses.map(w => (
                                <option key={w._id} value={w._id}>{w.name}</option>
                            ))}
                        </Select>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                            label="Delivery Note No."
                            type="text"
                            value={formData.supplierDeliveryNoteNumber}
                            onChange={(e) => setFormData(p => ({ ...p, supplierDeliveryNoteNumber: e.target.value }))}
                        />
                        <Input
                            label="Invoice Ref No."
                            type="text"
                            value={formData.supplierInvoiceNumber}
                            onChange={(e) => setFormData(p => ({ ...p, supplierInvoiceNumber: e.target.value }))}
                        />
                        <Input
                            label="Vehicle No."
                            type="text"
                            value={formData.vehicleNumber}
                            onChange={(e) => setFormData(p => ({ ...p, vehicleNumber: e.target.value }))}
                        />
                        <Input
                            label="Driver Name"
                            type="text"
                            value={formData.driverName}
                            onChange={(e) => setFormData(p => ({ ...p, driverName: e.target.value }))}
                        />
                        <Input
                            label="Transport Company"
                            type="text"
                            value={formData.transportCompany}
                            onChange={(e) => setFormData(p => ({ ...p, transportCompany: e.target.value }))}
                        />
                    </div>

                    {/* Direct GRN items entry form */}
                    {!formData.purchaseOrderId && (
                        <div className="border border-gray-150 p-4 rounded-xl bg-gray-50 space-y-4">
                            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Add Received Product</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                                <div className="md:col-span-2">
                                    <ProductAutocompleteSelect
                                        label="Product *"
                                        placeholder="Type to search or add..."
                                        products={products}
                                        value={newItem.productId}
                                        productType="raw_material" // Default type to create
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
                                    label="Quantity *"
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    placeholder="0.00"
                                    value={newItem.receivedQuantity}
                                    onChange={(e) => setNewItem(p => ({ ...p, receivedQuantity: e.target.value }))}
                                />
                                <Input
                                    label="Unit Price (LKR) *"
                                    type="number"
                                    min="0"
                                    step="any"
                                    placeholder="0.00"
                                    value={newItem.unitPrice}
                                    onChange={(e) => setNewItem(p => ({ ...p, unitPrice: e.target.value }))}
                                />
                                <div className="md:col-span-4 flex justify-end">
                                    <Button type="button" variant="primary" onClick={handleAddItem}>
                                        Add Line Item
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="text-sm font-bold text-gray-700 mb-2">GRN Items</h4>
                        <div className="overflow-x-auto border border-gray-150 rounded-xl">
                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Product</th>
                                        {formData.purchaseOrderId && <th className="px-4 py-3">PO Ordered</th>}
                                        <th className="px-4 py-3">Received Qty</th>
                                        <th className="px-4 py-3 text-right">Unit Price</th>
                                        <th className="px-4 py-3 text-right">Total</th>
                                        {!formData.purchaseOrderId && <th className="px-4 py-3 text-center">Action</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150 text-gray-700">
                                    {formData.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={formData.purchaseOrderId ? 5 : 5} className="px-4 py-8 text-center text-gray-400 italic">No items added to GRN yet.</td>
                                        </tr>
                                    ) : (
                                        formData.items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-3 font-semibold text-gray-900">{item.productName}</td>
                                                {formData.purchaseOrderId && <td className="px-4 py-3">{item.orderedQuantity} {item.unitOfMeasure}</td>}
                                                <td className="px-4 py-3">
                                                    {formData.purchaseOrderId ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            value={item.receivedQuantity}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value) || 0;
                                                                setFormData(p => {
                                                                    const updated = [...p.items];
                                                                    updated[idx].receivedQuantity = val;
                                                                    return { ...p, items: updated };
                                                                });
                                                            }}
                                                            className="w-24 px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-primary-500 outline-none font-bold"
                                                        />
                                                    ) : (
                                                        `${item.receivedQuantity} ${item.unitOfMeasure}`
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">Rs. {item.unitPrice?.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">Rs. {(item.receivedQuantity * item.unitPrice).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                                                {!formData.purchaseOrderId && (
                                                    <td className="px-4 py-3 text-center">
                                                        <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <Textarea
                        label="Receipt Notes / Comments"
                        placeholder="Add any additional transport or warehouse notes here..."
                        value={formData.notes}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                        rows={3}
                    />

                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <Button type="button" variant="default" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Record Receipt</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
