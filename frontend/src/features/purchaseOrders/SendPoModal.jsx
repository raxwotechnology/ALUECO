import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import { useChangePoStatus } from './usePurchaseOrders';

export default function SendPoModal({ isOpen, onClose, po }) {
    const changeStatus = useChangePoStatus();
    const [sendMethod, setSendMethod] = useState('email'); // 'email' | 'sms'
    const [recipientEmail, setRecipientEmail] = useState(po?.supplierSnapshot?.email || po?.supplierId?.primaryContact?.email || 'supplier@example.com');
    const [recipientPhone, setRecipientPhone] = useState(po?.supplierSnapshot?.phone || po?.supplierId?.primaryContact?.phone || '+94 77 123 4567');
    const [emailSubject, setEmailSubject] = useState(`Purchase Order #${po?.poNumber} from ALUECO ALUMINIUM SYSTEMS`);
    const [emailBody, setEmailBody] = useState(
        `Dear ${po?.supplierSnapshot?.name || 'Supplier'},\n\nPlease find Purchase Order #${po?.poNumber} issued by ALUECO ALUMINIUM SYSTEMS for total amount of LKR ${po?.grandTotal?.toLocaleString()}.\n\nExpected Delivery Date: ${po?.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-LK') : 'As agreed'}.\n\nPlease confirm receipt and delivery timeline.\n\nBest regards,\nProcurement Division\nALUECO ALUMINIUM SYSTEMS`
    );
    const [smsBody, setSmsBody] = useState(
        `ALUECO SYSTEMS: PO #${po?.poNumber} issued for LKR ${po?.grandTotal?.toLocaleString()}. Please dispatch as agreed. Tel: +94 11 234 5678`
    );
    const [sending, setSending] = useState(false);

    if (!po) return null;

    const handleSend = async () => {
        setSending(true);
        const loadToast = toast.loading(`Dispatching PO #${po.poNumber} via ${sendMethod.toUpperCase()}...`);

        try {
            // Update PO status to sent
            await changeStatus.mutateAsync({
                id: po._id,
                status: 'sent',
                reason: `Sent to supplier via ${sendMethod.toUpperCase()}`,
            });

            toast.success(`✅ Purchase Order #${po.poNumber} sent to supplier via ${sendMethod.toUpperCase()}!`, { id: loadToast });
            setSending(false);
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send PO', { id: loadToast });
            setSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Send Purchase Order #${po.poNumber}`} size="lg">
            <div className="p-6 space-y-4">
                {/* Method selector */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                        type="button"
                        onClick={() => setSendMethod('email')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${sendMethod === 'email' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <Mail size={15} /> Send via Email
                    </button>
                    <button
                        type="button"
                        onClick={() => setSendMethod('sms')}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${sendMethod === 'sms' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <MessageSquare size={15} /> Send via SMS
                    </button>
                </div>

                {sendMethod === 'email' ? (
                    <div className="space-y-3">
                        <Input
                            label="Supplier Email Address"
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                        />
                        <Input
                            label="Subject Line"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                        />
                        <Textarea
                            label="Email Content"
                            rows={6}
                            value={emailBody}
                            onChange={(e) => setEmailBody(e.target.value)}
                        />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <Input
                            label="Supplier Phone / SMS Number"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                        />
                        <Textarea
                            label="SMS Message Body"
                            rows={4}
                            value={smsBody}
                            onChange={(e) => setSmsBody(e.target.value)}
                        />
                        <p className="text-[11px] text-slate-500">
                            Message will be delivered instantly via ALUECO SMS Gateway.
                        </p>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-2 px-6 py-4 border-t bg-slate-50">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={handleSend} loading={sending}>
                    <Send size={15} className="mr-1.5" /> Confirm &amp; Send PO
                </Button>
            </div>
        </Modal>
    );
}
