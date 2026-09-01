import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PackageCheck, Sparkles } from 'lucide-react';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { useCreateGrn } from './usePurchaseOrders';
import api from '../../api/axios';

export default function GrnModal({ isOpen, onClose, purchaseOrder }) {
    const createMutation = useCreateGrn();

    const [supplierDN, setSupplierDN] = useState('');
    const [supplierInvoice, setSupplierInvoice] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [driverName, setDriverName] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([]);
    const [predictions, setPredictions] = useState({});

    useEffect(() => {
        if (isOpen && purchaseOrder) {
            // Initialize items with pending quantities
            const pendingItems = purchaseOrder.items
                .filter((i) => (i.orderedQuantity - (i.receivedQuantity || 0)) > 0)
                .map((i) => ({
                    poLineItemId: i._id,
                    productId: i.productId._id || i.productId,
                    productName: i.productName,
                    productCode: i.productCode,
                    orderedQuantity: i.orderedQuantity,
                    alreadyReceived: i.receivedQuantity || 0,
                    pending: i.orderedQuantity - (i.receivedQuantity || 0),
                    receivedQuantity: i.orderedQuantity - (i.receivedQuantity || 0),
                    acceptedQuantity: i.orderedQuantity - (i.receivedQuantity || 0),
                    rejectedQuantity: 0,
                    rejectionReason: '',
                    unitPrice: i.unitPrice,
                    batchNumber: '',
                    expiryDate: '',
                    unitOfMeasure: i.unitOfMeasure,
                }));
            setItems(pendingItems);
            setSupplierDN('');
            setSupplierInvoice('');
            setVehicleNumber('');
            setDriverName('');
            setNotes('');
            setPredictions({});
        }
    }, [isOpen, purchaseOrder]);

    const fetchPrediction = async (productId, weight, idx, cacheKey) => {
        if (!productId || !weight || weight <= 0) return;
        try {
            const { data } = await api.get('/products/predict-yield', {
                params: { productId, inputWeight: weight }
            });
            if (data?.success && data?.data) {
                setPredictions(prev => ({
                    ...prev,
                    [idx]: {
                        weight: data.data.predictedWeight,
                        name: data.data.outputProduct?.name,
                        unit: data.data.outputProduct?.unitOfMeasure || 'kg',
                        cacheKey
                    }
                }));
            } else {
                setPredictions(prev => ({
                    ...prev,
                    [idx]: { cacheKey, noRule: true }
                }));
            }
        } catch (err) {
            console.warn('Yield prediction failed:', err.message);
        }
    };

    useEffect(() => {
        items.forEach((item, idx) => {
            const qty = Number(item.acceptedQuantity) || 0;
            if (qty > 0) {
                const cacheKey = `${item.productId}-${qty}`;
                if (predictions[idx]?.cacheKey !== cacheKey) {
                    fetchPrediction(item.productId, qty, idx, cacheKey);
                }
            } else {
                if (predictions[idx]) {
                    setPredictions(prev => {
                        const next = { ...prev };
                        delete next[idx];
                        return next;
                    });
                }
            }
        });
    }, [items]);

    const updateItem = (idx, field, value) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [field]: value };

        // Auto-sync accepted = received - rejected
        if (field === 'receivedQuantity' || field === 'rejectedQuantity') {
            const received = +newItems[idx].receivedQuantity || 0;
            const rejected = +newItems[idx].rejectedQuantity || 0;
            newItems[idx].acceptedQuantity = Math.max(0, received - rejected);
        }
        setItems(newItems);
    };

    const handleSubmit = async () => {
        const toReceive = items.filter((i) => +i.receivedQuantity > 0);
        if (toReceive.length === 0) { toast.error('At least one item must be received'); return; }

        try {
            await createMutation.mutateAsync({
                purchaseOrderId: purchaseOrder._id,
                warehouseId: purchaseOrder.deliverTo?.warehouseId?._id || purchaseOrder.deliverTo?.warehouseId,
                supplierDeliveryNoteNumber: supplierDN || undefined,
                supplierInvoiceNumber: supplierInvoice || undefined,
                vehicleNumber: vehicleNumber || undefined,
                driverName: driverName || undefined,
                notes: notes || undefined,
                items: toReceive.map((i) => ({
                    poLineItemId: i.poLineItemId,
                    productId: i.productId,
                    receivedQuantity: +i.receivedQuantity,
                    acceptedQuantity: +i.acceptedQuantity,
                    rejectedQuantity: +i.rejectedQuantity || 0,
                    rejectionReason: i.rejectionReason || undefined,
                    unitPrice: +i.unitPrice,
                    batchNumber: i.batchNumber || undefined,
                    expiryDate: i.expiryDate || undefined,
                })),
            });
            onClose();
        } catch { }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Receive Goods — PO ${purchaseOrder?.poNumber}`} size="xl">
            <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3">
                    <PackageCheck size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                        Receiving goods will automatically increase stock at the delivery warehouse. Each line creates a stock movement record.
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Supplier Delivery Note #" value={supplierDN} onChange={(e) => setSupplierDN(e.target.value)} />
                    <Input label="Supplier Invoice #" value={supplierInvoice} onChange={(e) => setSupplierInvoice(e.target.value)} />
                    <Input label="Vehicle Number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
                    <Input label="Driver Name" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                </div>

                {items.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">All items fully received on this PO.</p>
                ) : (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Items</h4>
                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="border rounded-lg p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-medium text-sm">{item.productName}</p>
                                            <p className="text-xs text-gray-500 font-mono">{item.productCode}</p>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Ordered: {item.orderedQuantity} · Already received: {item.alreadyReceived} · Pending: <span className="font-medium">{item.pending}</span>
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-5 gap-2">
                                        <Input label="Received Qty" type="number" step="0.01" min="0" max={item.pending}
                                            value={item.receivedQuantity} onChange={(e) => updateItem(idx, 'receivedQuantity', e.target.value)} />
                                        <Input label="Rejected Qty" type="number" step="0.01" min="0"
                                            value={item.rejectedQuantity} onChange={(e) => updateItem(idx, 'rejectedQuantity', e.target.value)} />
                                        <Input label="Accepted" type="number" value={item.acceptedQuantity} disabled className="bg-gray-50" />
                                        <Input label="Batch #" value={item.batchNumber} onChange={(e) => updateItem(idx, 'batchNumber', e.target.value)} />
                                        <Input label="Expiry" type="date" value={item.expiryDate} onChange={(e) => updateItem(idx, 'expiryDate', e.target.value)} />
                                    </div>
                                    {+item.rejectedQuantity > 0 && (
                                        <div className="mt-2">
                                            <Input label="Rejection Reason" placeholder="Why were these rejected?"
                                                value={item.rejectionReason} onChange={(e) => updateItem(idx, 'rejectionReason', e.target.value)} />
                                        </div>
                                    )}
                                    {predictions[idx] && !predictions[idx].noRule && (
                                        <div className="mt-3 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-2 rounded-lg flex items-center gap-2">
                                            <Sparkles size={14} className="text-purple-600 animate-pulse" />
                                            <span>Live Yield Forecast: Expected output weight is <strong>{predictions[idx].weight} {predictions[idx].unit}</strong> of {predictions[idx].name}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleSubmit} loading={createMutation.isPending}
                    disabled={items.length === 0 || !items.some((i) => +i.receivedQuantity > 0)}>
                    <PackageCheck size={16} className="mr-1.5" /> Confirm Receipt
                </Button>
            </div>
        </Modal>
    );
}