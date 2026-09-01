import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useSendGrnSms } from './usePurchaseOrders';
import { Mail } from 'lucide-react';

export default function SendGrnSmsModal({ isOpen, onClose, grn }) {
    const sendSmsMutation = useSendGrnSms();
    const [smsMessage, setSmsMessage] = useState('');
    const [isCustomized, setIsCustomized] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSmsMessage('');
            setIsCustomized(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && grn && !isCustomized) {
            const supplierName = grn.supplierName || 'Supplier';
            const formattedDate = grn.receiptDate ? new Date(grn.receiptDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            
            const productsList = (grn.items || []).map(item => {
                const qty = Number(item.acceptedQuantity || item.receivedQuantity || 0);
                const uom = item.unitOfMeasure || 'kg';
                return `${item.productName} (${qty} ${uom})`;
            }).join(', ');

            const totalPayable = grn.totalPayableLKR || grn.totalAcceptedValue || 0;
            const formattedTotal = totalPayable.toLocaleString('en-LK', { minimumFractionDigits: 2 });

            const message = `Dear ${supplierName}, your delivery on ${formattedDate} for ${productsList} has been accepted and QA approved. Total accepted value: Rs. ${formattedTotal}. Thank you.`;
            setSmsMessage(message);
        }
    }, [isOpen, grn, isCustomized]);

    const handleSend = async () => {
        try {
            await sendSmsMutation.mutateAsync({
                id: grn._id,
                data: { customMessage: smsMessage }
            });
            onClose();
        } catch (err) {
            // Toast error handled by the react-query mutation handler
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Send Manual SMS — GRN ${grn?.grnNumber}`} size="md">
            <div className="p-6 space-y-4">
                <p className="text-xs text-gray-500 leading-normal">
                    You can customize and send/resend the QA approval confirmation SMS to the supplier.
                </p>

                <div className="bg-slate-50 p-3 rounded-lg text-xs border space-y-1 text-gray-700 border-gray-150">
                    <div><strong>Supplier:</strong> {grn?.supplierName || 'Unknown'}</div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 block mb-1">SMS Message Content (Editable)</label>
                    <textarea
                        className="w-full p-2.5 bg-slate-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                        rows={5}
                        value={smsMessage}
                        onChange={(e) => {
                            setSmsMessage(e.target.value);
                            setIsCustomized(true);
                        }}
                        placeholder="Type custom SMS message here..."
                        maxLength={1000}
                        disabled={sendSmsMutation.isPending}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400">
                        <span>{isCustomized ? '⚠️ Custom message' : '✨ Generated template'}</span>
                        <span>{smsMessage.length} characters</span>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
                <Button variant="outline" onClick={onClose} disabled={sendSmsMutation.isPending}>Cancel</Button>
                <Button variant="primary" onClick={handleSend} loading={sendSmsMutation.isPending} disabled={!smsMessage.trim()}>
                    <Mail size={16} className="mr-1.5" /> Send Custom SMS
                </Button>
            </div>
        </Modal>
    );
}
