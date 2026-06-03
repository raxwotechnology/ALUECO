import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Send, Ban, PackageCheck, Receipt } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import GrnModal from '../features/purchaseOrders/GrnModal';
import QaApprovalModal from '../features/purchaseOrders/QaApprovalModal';
import { usePurchaseOrder, useChangePoStatus } from '../features/purchaseOrders/usePurchaseOrders';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    draft: 'default', pending_approval: 'warning', approved: 'info',
    sent: 'info', partially_received: 'warning', fully_received: 'success',
    closed: 'success', cancelled: 'danger',
};

export default function PurchaseOrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState('');
    const [isGrnOpen, setIsGrnOpen] = useState(false);
    const [selectedGrnToApprove, setSelectedGrnToApprove] = useState(null);

    const { data, isLoading } = usePurchaseOrder(id);
    const changeStatus = useChangePoStatus();
    const po = data?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    if (isLoading || !po) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    const canApprove = ['admin', 'manager', 'accountant'].includes(user.role);
    const canReceive = ['admin', 'manager', 'warehouse_staff'].includes(user.role);

    const actions = [];
    if (['draft', 'pending_approval'].includes(po.status) && canApprove) {
        actions.push({ label: 'Approve', icon: CheckCircle, variant: 'primary', status: 'approved' });
    }
    if (po.status === 'approved' && canApprove) {
        actions.push({ label: 'Mark Sent', icon: Send, variant: 'primary', status: 'sent' });
    }
    if (['approved', 'sent', 'partially_received'].includes(po.status) && canReceive) {
        actions.push({ label: 'Receive Goods', icon: PackageCheck, variant: 'primary', onClick: () => setIsGrnOpen(true) });
    }
    if (['partially_received', 'fully_received'].includes(po.status) && canApprove) {
        actions.push({ label: 'Close PO', icon: CheckCircle, variant: 'outline', status: 'closed' });
    }
    if (!['closed', 'cancelled', 'fully_received'].includes(po.status) && canApprove) {
        actions.push({ label: 'Cancel', icon: Ban, variant: 'danger', status: 'cancelled', needsReason: true });
    }
    if (po.grns?.length > 0 && canApprove) {
        actions.push({ label: 'Create Bill', icon: Receipt, variant: 'outline', onClick: () => navigate(`/bills/from-grn?poId=${po._id}`), });
    }

    const handleAction = async () => {
        await changeStatus.mutateAsync({ id: po._id, status: action.status, reason });
        setAction(null); setReason('');
    };

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">
                    PO {po.poNumber}
                    <Badge variant={statusVariant[po.status]}>{po.status.replace('_', ' ')}</Badge>
                </span>}
                description={`Created ${fmtDate(po.createdAt)}`}
                actions={
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => navigate('/purchase-orders')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        {actions.map((a) => (
                            <Button key={a.label} variant={a.variant} onClick={a.onClick || (() => setAction(a))}>
                                <a.icon size={16} className="mr-1.5" /> {a.label}
                            </Button>
                        ))}
                    </div>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Supplier & Delivery</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Supplier</p>
                                <p className="font-medium">{po.supplierSnapshot?.name}</p>
                                <p className="text-sm text-gray-600">{po.supplierSnapshot?.code}</p>
                                {po.supplierSnapshot?.taxRegistrationNumber && (
                                    <p className="text-sm text-gray-600">VAT: {po.supplierSnapshot.taxRegistrationNumber}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Deliver To</p>
                                <p className="font-medium">{po.deliverTo?.warehouseName}</p>
                                {po.deliverTo?.address?.line1 && (
                                    <p className="text-sm text-gray-600 mt-1">
                                        {po.deliverTo.address.line1}{po.deliverTo.address.city && `, ${po.deliverTo.address.city}`}
                                    </p>
                                )}
                                {po.expectedDeliveryDate && (
                                    <p className="text-sm text-gray-600 mt-2">
                                        Expected: <span className="font-medium">{fmtDate(po.expectedDeliveryDate)}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="px-6 py-4 border-b flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">Items</h3>
                            <div className="text-xs text-gray-500">
                                Receipt: <span className="font-medium">{Math.round(po.receiptCompletionPercent || 0)}%</span>
                            </div>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Ordered</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Received</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Price</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {po.items.map((item) => (
                                    <tr key={item._id || item.lineNumber}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm">{item.productName}</p>
                                            <p className="text-xs font-mono text-gray-500">{item.productCode}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">{item.orderedQuantity} {item.unitOfMeasure}</td>
                                        <td className="px-4 py-3 text-right text-sm">
                                            <span className={item.receivedQuantity >= item.orderedQuantity ? 'text-green-600 font-medium' : ''}>
                                                {item.receivedQuantity || 0}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">{fmt(item.unitPrice)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium">{fmt(item.lineTotal)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge variant={
                                                item.lineStatus === 'fully_received' ? 'success' :
                                                    item.lineStatus === 'partially_received' ? 'warning' : 'default'
                                            }>{item.lineStatus?.replace('_', ' ')}</Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    {po.notes && (
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                            <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
                        </Card>
                    )}

                    {po.grns?.length > 0 && (
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Goods Received</h3>
                            <div className="space-y-2">
                                {po.grns.map((g) => (
                                    <div key={g._id} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
                                        <div>
                                            <p className="text-sm font-bold font-mono text-gray-800">{g.grnNumber}</p>
                                            <p className="text-xs text-gray-500">{fmtDate(g.receiptDate)}</p>
                                        </div>
                                        {g.status === 'pending_approval' ? (
                                            <div className="flex items-center gap-2">
                                                <Badge variant="warning">Pending QA</Badge>
                                                {canApprove && (
                                                    <Button size="xs" variant="primary" onClick={() => setSelectedGrnToApprove(g)}>
                                                        Approve QA
                                                    </Button>
                                                )}
                                            </div>
                                        ) : (
                                            <Badge variant="success">Approved</Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{fmt(po.subtotal)}</span></div>
                            {po.totalDiscount > 0 && (<div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="text-red-600">-{fmt(po.totalDiscount)}</span></div>)}
                            <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>{fmt(po.totalTax)}</span></div>
                            {po.shippingCost > 0 && (<div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{fmt(po.shippingCost)}</span></div>)}
                            {po.otherCharges > 0 && (<div className="flex justify-between"><span className="text-gray-600">Other</span><span>{fmt(po.otherCharges)}</span></div>)}
                            <div className="flex justify-between pt-3 border-t font-bold">
                                <span>Total</span><span className="text-primary-600">{fmt(po.grandTotal)}</span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Details</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">PO Date</span><span>{fmtDate(po.poDate)}</span></div>
                            {po.expectedDeliveryDate && <div className="flex justify-between"><span className="text-gray-500">Expected</span><span>{fmtDate(po.expectedDeliveryDate)}</span></div>}
                            <div className="flex justify-between"><span className="text-gray-500">Payment</span><span className="uppercase text-xs">{po.paymentTerms?.type}</span></div>
                            {po.paymentTerms?.dueDate && <div className="flex justify-between"><span className="text-gray-500">Due Date</span><span>{fmtDate(po.paymentTerms.dueDate)}</span></div>}
                            {po.shippingTerms && <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{po.shippingTerms}</span></div>}
                        </div>
                    </Card>
                </div>
            </div>

            <GrnModal isOpen={isGrnOpen} onClose={() => setIsGrnOpen(false)} purchaseOrder={po} />

            <QaApprovalModal isOpen={!!selectedGrnToApprove} onClose={() => setSelectedGrnToApprove(null)} grn={selectedGrnToApprove} />

            <ConfirmDialog
                isOpen={!!action}
                onClose={() => { setAction(null); setReason(''); }}
                onConfirm={handleAction}
                title={action?.label}
                message={
                    action?.needsReason ? (
                        <div>
                            <p className="mb-3">Please provide a reason:</p>
                            <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                                value={reason} onChange={(e) => setReason(e.target.value)} />
                        </div>
                    ) : `${action?.label} this purchase order?`
                }
                confirmText={action?.label}
                variant={action?.variant === 'danger' ? 'danger' : 'primary'}
                loading={changeStatus.isPending}
            />
        </div>
    );
}