import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ShieldCheck, AlertCircle } from 'lucide-react';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useApproveGrnQA } from './usePurchaseOrders';

export default function QaApprovalModal({ isOpen, onClose, grn }) {
    const approveMutation = useApproveGrnQA();
    const [items, setItems] = useState([]);
    const [paidAmountLKR, setPaidAmountLKR] = useState('0');
    const [sendSms, setSendSms] = useState(true);
    const [smsMessage, setSmsMessage] = useState('');
    const [isCustomized, setIsCustomized] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSendSms(true);
            setSmsMessage('');
            setIsCustomized(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && grn && !isCustomized) {
            const supplierName = grn.supplierName || 'Supplier';
            const formattedDate = grn.receiptDate ? new Date(grn.receiptDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            
            // Generate product list from current items state
            const productsList = items.map(item => {
                const qty = Number(item.acceptedQuantity) || 0;
                const uom = item.unitOfMeasure || 'kg';
                return `${item.productName} (${qty} ${uom})`;
            }).join(', ');

            const totalPayable = items.reduce((sum, item) => sum + (Number(item.acceptedQuantity || 0) * (item.unitPrice || 0)), 0);
            const formattedTotal = totalPayable.toLocaleString('en-LK', { minimumFractionDigits: 2 });

            const message = `Dear ${supplierName}, your delivery on ${formattedDate} for ${productsList} has been accepted and QA approved. Total accepted value: Rs. ${formattedTotal}. Thank you.`;
            setSmsMessage(message);
        }
    }, [isOpen, grn, items, isCustomized]);

    useEffect(() => {
        if (isOpen && grn) {
            const grnItems = (grn.items || []).map((item) => ({
                _id: item._id,
                productId: item.productId?._id || item.productId,
                productName: item.productName,
                productCode: item.productCode,
                receivedQuantity: item.receivedQuantity,
                acceptedQuantity: item.receivedQuantity, // default to all accepted
                rejectedQuantity: 0,
                unitPrice: item.unitPrice || 0,
                batchNumber: item.batchNumber || '',
                rejectionReason: '',
                unitOfMeasure: item.unitOfMeasure || 'kg'
            }));
            setItems(grnItems);
            setPaidAmountLKR('0');
        }
    }, [isOpen, grn]);

    const updateItem = (idx, field, value) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [field]: value };

        if (field === 'rejectedQuantity') {
            const received = Number(newItems[idx].receivedQuantity) || 0;
            const rejected = Number(value) || 0;
            newItems[idx].acceptedQuantity = Math.max(0, received - rejected);
        } else if (field === 'acceptedQuantity') {
            const received = Number(newItems[idx].receivedQuantity) || 0;
            const accepted = Number(value) || 0;
            newItems[idx].rejectedQuantity = Math.max(0, received - accepted);
        }
        setItems(newItems);
    };

    const handleApprove = async () => {
        try {
            const payload = {
                paidAmountLKR: Number(paidAmountLKR || 0),
                items: items.map(i => ({
                    _id: i._id,
                    acceptedQuantity: Number(i.acceptedQuantity || 0),
                    rejectedQuantity: Number(i.rejectedQuantity || 0),
                    batchNumber: i.batchNumber || undefined,
                    rejectionReason: i.rejectionReason || undefined
                })),
                sendSms: sendSms,
                customMessage: sendSms ? smsMessage : undefined
            };
            await approveMutation.mutateAsync({ id: grn._id, data: payload });
            toast.success('Supplies QA Approved successfully. Stock and Ledger updated.');
            onClose();
        } catch (err) {
            // Handled by mutation
        }
    };

    const calculateTotalPayable = () => {
        return items.reduce((sum, item) => sum + (Number(item.acceptedQuantity || 0) * (item.unitPrice || 0)), 0);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`QA Inspection & Approval — GRN ${grn?.grnNumber}`} size="lg">
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-3 text-emerald-950">
                    <ShieldCheck size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        Confirming QA approval will update active stock levels, increment PO received stats, update Supplier Accounts Payable balance, and generate batch codes.
                    </div>
                </div>

                <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700">Receipt Details & Inspection</h4>
                    
                    {items.map((item, idx) => (
                        <div key={idx} className="border rounded-xl p-4 bg-slate-50/50 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-sm text-gray-800">{item.productName}</p>
                                    <p className="text-xs font-mono text-gray-500">{item.productCode}</p>
                                </div>
                                <span className="bg-indigo-50 text-indigo-800 border border-indigo-100 text-xs px-2 py-0.5 rounded font-bold">
                                    Received: {item.receivedQuantity} {item.unitOfMeasure}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <Input
                                    label="Accepted Qty"
                                    type="number"
                                    step="0.01"
                                    value={item.acceptedQuantity}
                                    onChange={(e) => updateItem(idx, 'acceptedQuantity', e.target.value)}
                                />
                                <Input
                                    label="Rejected Qty"
                                    type="number"
                                    step="0.01"
                                    value={item.rejectedQuantity}
                                    onChange={(e) => updateItem(idx, 'rejectedQuantity', e.target.value)}
                                />
                                <div className="md:col-span-2">
                                    <Input
                                        label="Batch Code override (Leave empty for Auto Julian Code)"
                                        placeholder="e.g. CUSTOM-CODE"
                                        value={item.batchNumber}
                                        onChange={(e) => updateItem(idx, 'batchNumber', e.target.value)}
                                    />
                                </div>
                            </div>

                            {Number(item.rejectedQuantity) > 0 && (
                                <Input
                                    label="Rejection Reason"
                                    placeholder="Enter rejection notes..."
                                    value={item.rejectionReason}
                                    onChange={(e) => updateItem(idx, 'rejectionReason', e.target.value)}
                                />
                            )}
                        </div>
                    ))}
                </div>

                <div className="border-t pt-4 grid grid-cols-2 gap-4">
                    <div className="bg-slate-100 rounded-xl p-4 text-sm font-semibold flex flex-col justify-center">
                        <span className="text-gray-500 text-xs font-bold block mb-1">Calculated Total Payable:</span>
                        <span className="text-lg font-black text-gray-900">
                            {new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(calculateTotalPayable())}
                        </span>
                    </div>

                    <Input
                        label="Paid Amount LKR (Optional Cash/Bank Advance)"
                        type="number"
                        placeholder="e.g. 50000"
                        value={paidAmountLKR}
                        onChange={(e) => setPaidAmountLKR(e.target.value)}
                    />
                </div>

                <div className="border-t pt-4 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                            checked={sendSms}
                            onChange={(e) => setSendSms(e.target.checked)}
                        />
                        <span className="text-sm font-bold text-gray-700">Send confirmation SMS to supplier</span>
                    </label>

                    {sendSms && (
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 block mb-1">SMS Message Content (Editable)</label>
                            <textarea
                                className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                                rows={3}
                                value={smsMessage}
                                onChange={(e) => {
                                    setSmsMessage(e.target.value);
                                    setIsCustomized(true);
                                }}
                                placeholder="Type custom SMS message here..."
                                maxLength={1000}
                            />
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>{isCustomized ? '⚠️ Custom message' : '✨ Generated template'}</span>
                                <span>{smsMessage.length} characters</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleApprove} loading={approveMutation.isPending}>
                    <ShieldCheck size={16} className="mr-1.5" /> Approve Supplies
                </Button>
            </div>
        </Modal>
    );
}
