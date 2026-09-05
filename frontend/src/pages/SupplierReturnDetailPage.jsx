import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Receipt } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useSupplierReturn, useSendSupplierReturn, useRecordSupplierCredit } from '../features/returns/useReturns';

export default function SupplierReturnDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data } = useSupplierReturn(id);
    const sendMutation = useSendSupplierReturn();
    const creditMutation = useRecordSupplierCredit();

    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
    const [isCreditOpen, setIsCreditOpen] = useState(false);
    const [actualCreditReceived, setActualCreditReceived] = useState(0);
    const [creditReferenceNumber, setCreditReferenceNumber] = useState('');
    const [creditReceivedDate, setCreditReceivedDate] = useState(new Date().toISOString().slice(0, 10));

    const sr = data?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    if (!sr) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    const handleSend = async () => { await sendMutation.mutateAsync(sr._id); setIsSendDialogOpen(false); };
    const handleCredit = async () => {
        await creditMutation.mutateAsync({ id: sr._id, data: { actualCreditReceived: +actualCreditReceived, creditReferenceNumber, creditReceivedDate } });
        setIsCreditOpen(false);
    };

    return (
        <div>
            <PageHeader title={<>Supplier Return {sr.returnNumber} <Badge>{sr.status.replace(/_/g, ' ')}</Badge></>}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/supplier-returns')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {sr.status === 'draft' && (
                            <Button variant="primary" onClick={() => setIsSendDialogOpen(true)}>
                                <Send size={16} className="mr-1.5" /> Send Return (deduct stock)
                            </Button>
                        )}
                        {sr.status === 'sent' && (
                            <Button variant="primary" onClick={() => setIsCreditOpen(true)}>
                                <Receipt size={16} className="mr-1.5" /> Record Supplier Credit
                            </Button>
                        )}
                    </div>
                } />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <p className="text-sm"><span className="text-gray-500">Supplier:</span> {sr.supplierSnapshot?.name}</p>
                        <p className="text-sm"><span className="text-gray-500">From warehouse:</span> {sr.warehouseId?.name}</p>
                        <p className="text-sm"><span className="text-gray-500">Return date:</span> {fmtDate(sr.returnDate)}</p>
                    </Card>

                    <Card>
                        <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold">Items</h3></div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Unit Price</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Reason</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {sr.items.map((i) => (
                                    <tr key={i._id}>
                                        <td className="px-4 py-3 text-sm">{i.productName}</td>
                                        <td className="px-4 py-3 text-right text-sm">{i.quantity}</td>
                                        <td className="px-4 py-3 text-right text-sm">{fmt(i.unitPrice)}</td>
                                        <td className="px-4 py-3 text-sm">{i.reason.replace(/_/g, ' ')}</td>
                                        <td className="px-4 py-3 text-right text-sm">{fmt(i.quantity * i.unitPrice)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>

                <div>
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold mb-4">Financial</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Return Value</span><span>{fmt(sr.totalReturnValue)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Expected Credit</span><span>{fmt(sr.expectedCreditAmount)}</span></div>
                            <div className="flex justify-between pt-3 border-t"><span className="font-semibold">Actual Credit</span>
                                <span className="font-bold">{fmt(sr.actualCreditReceived)}</span></div>
                            {sr.creditReferenceNumber && <p className="text-xs pt-2 text-gray-500">Ref: {sr.creditReferenceNumber}</p>}
                        </div>
                    </Card>
                </div>
            </div>

            <ConfirmDialog isOpen={isSendDialogOpen} onClose={() => setIsSendDialogOpen(false)}
                onConfirm={handleSend} title="Send Return to Supplier"
                message="This will deduct stock from your warehouse immediately. Continue?"
                variant="primary" loading={sendMutation.isPending} />

            <Modal isOpen={isCreditOpen} onClose={() => setIsCreditOpen(false)} title="Record Supplier Credit" size="md">
                <div className="p-6 space-y-4">
                    <Input label="Amount received (LKR)" required type="number" step="0.01" min="0"
                        value={actualCreditReceived} onChange={(e) => setActualCreditReceived(e.target.value)} />
                    <Input label="Supplier's credit note #" value={creditReferenceNumber}
                        onChange={(e) => setCreditReferenceNumber(e.target.value)} />
                    <Input label="Date received" type="date" value={creditReceivedDate}
                        onChange={(e) => setCreditReceivedDate(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsCreditOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleCredit} loading={creditMutation.isPending}>Record</Button>
                </div>
            </Modal>
        </div>
    );
}