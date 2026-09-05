import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Package, ClipboardCheck, FileText } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import { useReturn, useReturnActions } from '../features/returns/useReturns';
import { useWarehouses } from '../features/warehouses/useWarehouses';

const statusVariant = {
    draft: 'default', approved: 'info', awaiting_return: 'info',
    received: 'warning', inspecting: 'warning', processed: 'warning',
    completed: 'success', rejected: 'danger', cancelled: 'default',
};

const dispositionOptions = [
    { value: 'pending', label: 'Pending decision' },
    { value: 'restock', label: 'Restock (good condition)' },
    { value: 'repair', label: 'Send to repair' },
    { value: 'scrap', label: 'Scrap (damaged)' },
    { value: 'return_to_supplier', label: 'Return to supplier' },
    { value: 'refund_only_no_return', label: 'Refund only (no physical return)' },
];

export default function ReturnDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data, isLoading } = useReturn(id);
    const actions = useReturnActions();
    const { data: warehousesData } = useWarehouses({ isActive: true });

    const [actionDialog, setActionDialog] = useState(null);
    const [reason, setReason] = useState('');
    const [isReceiveOpen, setIsReceiveOpen] = useState(false);
    const [warehouseId, setWarehouseId] = useState('');
    const [isProcessOpen, setIsProcessOpen] = useState(false);
    const [processItems, setProcessItems] = useState([]);

    const ret = data?.data;
    const warehouses = warehousesData?.data || [];
    const warehouseOptions = warehouses.map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseCode})` }));

    useEffect(() => {
        if (ret) {
            setProcessItems(ret.items.map((i) => ({
                itemId: i._id,
                productName: i.productName,
                quantityReturned: i.quantityReturned,
                condition: i.condition || 'pending_inspection',
                disposition: i.disposition || 'pending',
                inspectionNotes: i.inspectionNotes || '',
                refundAmount: i.refundAmount,
                refundable: i.refundable,
            })));
        }
    }, [ret]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    if (isLoading || !ret) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    const handleApprove = async () => { await actions.approve.mutateAsync(ret._id); setActionDialog(null); };
    const handleReject = async () => { await actions.reject.mutateAsync({ id: ret._id, reason }); setActionDialog(null); setReason(''); };
    const handleReceive = async () => {
        if (!warehouseId) return;
        await actions.receive.mutateAsync({ id: ret._id, data: { warehouseId } });
        setIsReceiveOpen(false);
    };
    const handleProcess = async () => {
        await actions.process.mutateAsync({
            id: ret._id,
            data: {
                items: processItems.map((p) => ({
                    itemId: p.itemId, condition: p.condition, disposition: p.disposition,
                    inspectionNotes: p.inspectionNotes, refundAmount: +p.refundAmount, refundable: p.refundable,
                })),
            },
        });
        setIsProcessOpen(false);
    };
    const handleIssueCreditNote = async () => { await actions.issueCreditNote.mutateAsync(ret._id); setActionDialog(null); };

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">
                    RMA {ret.rmaNumber}
                    <Badge variant={statusVariant[ret.status]}>{ret.status.replace(/_/g, ' ')}</Badge>
                </span>}
                description={`Customer: ${ret.customerSnapshot?.name}`}
                actions={
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => navigate('/returns')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {ret.status === 'draft' && (
                            <>
                                <Button variant="primary" onClick={() => setActionDialog('approve')}>
                                    <CheckCircle size={16} className="mr-1.5" /> Approve
                                </Button>
                                <Button variant="danger" onClick={() => setActionDialog('reject')}>
                                    <XCircle size={16} className="mr-1.5" /> Reject
                                </Button>
                            </>
                        )}
                        {ret.status === 'approved' && (
                            <Button variant="primary" onClick={() => setIsReceiveOpen(true)}>
                                <Package size={16} className="mr-1.5" /> Mark Received
                            </Button>
                        )}
                        {ret.status === 'received' && (
                            <Button variant="primary" onClick={() => setIsProcessOpen(true)}>
                                <ClipboardCheck size={16} className="mr-1.5" /> Process & Inspect
                            </Button>
                        )}
                        {ret.status === 'processed' && !ret.creditNoteId && (
                            <Button variant="primary" onClick={() => setActionDialog('creditNote')}>
                                <FileText size={16} className="mr-1.5" /> Issue Credit Note
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card>
                        <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold">Items</h3></div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Reason</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Disposition</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Refund</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {ret.items.map((item) => (
                                    <tr key={item._id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm">{item.productName}</p>
                                            <p className="text-xs font-mono text-gray-500">{item.productCode}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">{item.quantityReturned}</td>
                                        <td className="px-4 py-3 text-sm">{item.reason.replace(/_/g, ' ')}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <Badge>{item.disposition?.replace(/_/g, ' ')}</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">{fmt(item.refundAmount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    {ret.customerNotes && (
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold mb-2">Customer Notes</h3>
                            <p className="text-sm">{ret.customerNotes}</p>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Return Value</span><span>{fmt(ret.totalReturnValue)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Restocking Fees</span><span className="text-red-600">-{fmt(ret.totalRestockingFees)}</span></div>
                            <div className="flex justify-between pt-3 border-t font-bold">
                                <span>Net Refund</span>
                                <span className="text-primary-600">{fmt(ret.netRefundAmount)}</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold mb-4">Timeline</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Requested</span><span>{fmtDate(ret.requestDate)}</span></div>
                            {ret.approvedAt && <div className="flex justify-between"><span className="text-gray-500">Approved</span><span>{fmtDate(ret.approvedAt)}</span></div>}
                            {ret.receivedDate && <div className="flex justify-between"><span className="text-gray-500">Received</span><span>{fmtDate(ret.receivedDate)}</span></div>}
                            {ret.completedDate && <div className="flex justify-between"><span className="text-gray-500">Completed</span><span>{fmtDate(ret.completedDate)}</span></div>}
                        </div>
                    </Card>

                    {ret.creditNoteId && (
                        <Card className="p-6 bg-green-50 border-green-200">
                            <h3 className="text-sm font-semibold text-green-800">Credit Note Issued</h3>
                            <p className="text-sm mt-1">
                                <button onClick={() => navigate(`/credit-notes/${ret.creditNoteId._id}`)}
                                    className="text-green-700 underline">
                                    {ret.creditNoteId.creditNoteNumber}
                                </button>
                            </p>
                            <p className="text-sm text-green-700">{fmt(ret.creditNoteId.amount)}</p>
                        </Card>
                    )}

                    {ret.rejectionReason && (
                        <Card className="p-6 bg-red-50 border-red-200">
                            <h3 className="text-sm font-semibold text-red-800">Rejected</h3>
                            <p className="text-sm text-red-700 mt-1">{ret.rejectionReason}</p>
                        </Card>
                    )}
                </div>
            </div>

            <ConfirmDialog
                isOpen={actionDialog === 'approve'} onClose={() => setActionDialog(null)}
                onConfirm={handleApprove} title="Approve Return" message="Approve this return request?"
                loading={actions.approve.isPending} />

            <ConfirmDialog
                isOpen={actionDialog === 'reject'} onClose={() => { setActionDialog(null); setReason(''); }}
                onConfirm={handleReject} title="Reject Return"
                message={<div>
                    <p className="mb-3">Rejection reason:</p>
                    <textarea rows={3} className="w-full px-3 py-2 border rounded text-sm"
                        value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>}
                variant="danger" loading={actions.reject.isPending} />

            <ConfirmDialog
                isOpen={actionDialog === 'creditNote'} onClose={() => setActionDialog(null)}
                onConfirm={handleIssueCreditNote} title="Issue Credit Note"
                message={`Issue a credit note for ${fmt(ret.netRefundAmount)}? This closes the return.`}
                loading={actions.issueCreditNote.isPending} />

            <Modal isOpen={isReceiveOpen} onClose={() => setIsReceiveOpen(false)} title="Receive Returned Goods" size="md">
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">Where are the returned items being stored?</p>
                    <Select label="Warehouse" required options={warehouseOptions}
                        value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsReceiveOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleReceive} loading={actions.receive.isPending} disabled={!warehouseId}>
                        Mark Received
                    </Button>
                </div>
            </Modal>

            <Modal isOpen={isProcessOpen} onClose={() => setIsProcessOpen(false)} title="Process & Inspect Returned Items" size="xl">
                <div className="p-6 space-y-3">
                    <p className="text-sm text-blue-900 bg-blue-50 p-3 rounded">
                        Assign a disposition for each item. Restock will add it back to stock. Scrap creates a damage record. Repair creates a repair order.
                    </p>
                    {processItems.map((p, idx) => (
                        <div key={idx} className="border rounded-lg p-3">
                            <p className="font-medium text-sm mb-2">{p.productName} — qty {p.quantityReturned}</p>
                            <div className="grid grid-cols-2 gap-3">
                                <Select label="Condition"
                                    options={[
                                        { value: 'pending_inspection', label: 'Pending inspection' },
                                        { value: 'resellable', label: 'Resellable' },
                                        { value: 'repairable', label: 'Repairable' },
                                        { value: 'damaged', label: 'Damaged' },
                                        { value: 'expired', label: 'Expired' },
                                        { value: 'missing', label: 'Missing' },
                                    ]}
                                    value={p.condition}
                                    onChange={(e) => {
                                        const newP = [...processItems]; newP[idx].condition = e.target.value; setProcessItems(newP);
                                    }} />
                                <Select label="Disposition" options={dispositionOptions}
                                    value={p.disposition}
                                    onChange={(e) => {
                                        const newP = [...processItems]; newP[idx].disposition = e.target.value; setProcessItems(newP);
                                    }} />
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <Input label="Refund amount (LKR)" type="number" step="0.01" min="0"
                                    value={p.refundAmount}
                                    onChange={(e) => {
                                        const newP = [...processItems]; newP[idx].refundAmount = e.target.value; setProcessItems(newP);
                                    }} />
                                <div className="flex items-end pb-2">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={p.refundable}
                                            onChange={(e) => {
                                                const newP = [...processItems]; newP[idx].refundable = e.target.checked; setProcessItems(newP);
                                            }} />
                                        Refundable
                                    </label>
                                </div>
                            </div>
                            <Textarea label="Inspection notes" rows={2} value={p.inspectionNotes}
                                onChange={(e) => {
                                    const newP = [...processItems]; newP[idx].inspectionNotes = e.target.value; setProcessItems(newP);
                                }} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                    <Button variant="outline" onClick={() => setIsProcessOpen(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleProcess} loading={actions.process.isPending}>
                        Process Return
                    </Button>
                </div>
            </Modal>
        </div>
    );
}