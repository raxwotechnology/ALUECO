import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Truck, PackageCheck, Ban, FileText } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useSalesOrder, useChangeOrderStatus } from '../features/salesOrders/useSalesOrders';
import { useAuthStore } from '../store/authStore';

const statusVariant = {
    draft: 'default',
    pending_approval: 'warning',
    approved: 'info',
    dispatched: 'info',
    delivered: 'success',
    completed: 'success',
    on_hold: 'warning',
    cancelled: 'danger',
};

export default function SalesOrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState('');

    const { data, isLoading } = useSalesOrder(id);
    const changeStatus = useChangeOrderStatus();

    const order = data?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', {
        style: 'currency', currency: 'LKR', minimumFractionDigits: 2,
    }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    if (isLoading || !order) {
        return <div className="py-16 text-center text-gray-500">Loading order...</div>;
    }

    const canApprove = ['admin', 'manager', 'sales_manager', 'accountant'].includes(user.role);
    const canDispatch = ['admin', 'manager', 'warehouse_staff'].includes(user.role);
    const canCancel = ['admin', 'manager', 'sales_manager'].includes(user.role);

    const handleAction = async () => {
        if (action?.onClick) { action.onClick(); setAction(null); return; }
        await changeStatus.mutateAsync({ id: order._id, status: action.status, reason });
        setAction(null);
        setReason('');
    };

    const actionButtons = [];
    if (['draft', 'pending_approval'].includes(order.status) && canApprove) {
        actionButtons.push({ label: 'Approve', icon: CheckCircle, variant: 'primary', status: 'approved' });
    }
    if (order.status === 'approved' && canDispatch) {
        actionButtons.push({ label: 'Mark Dispatched', icon: Truck, variant: 'primary', status: 'dispatched' });
    }
    if (order.status === 'dispatched' && canDispatch) {
        actionButtons.push({ label: 'Mark Delivered', icon: PackageCheck, variant: 'primary', status: 'delivered' });
    }
    if (order.status === 'delivered' && canApprove) {
        actionButtons.push({ label: 'Mark Completed', icon: CheckCircle, variant: 'primary', status: 'completed' });
    }
    if (order.status === 'delivered' && !order.invoiceId && canApprove) {
        actionButtons.push({
            label: 'Create Invoice',
            icon: FileText,
            variant: 'primary',
            onClick: () => navigate(`/invoices/from-sales-order?orderIds=${order._id}`),
        });
    }
    if (order.invoiceId) {
        actionButtons.push({
            label: 'View Invoice',
            icon: FileText,
            variant: 'outline',
            onClick: () => navigate(`/invoices/${order.invoiceId._id || order.invoiceId}`),
        });
    }
    if (!['completed', 'cancelled'].includes(order.status) && canCancel) {
        actionButtons.push({ label: 'Cancel', icon: Ban, variant: 'danger', status: 'cancelled', needsReason: true });
    }

    return (
        <div>
            {/* ─── PAGE HEADER ─── */}
            <div className="mb-6">
                {/* Title row */}
                <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                        Order {order.orderNumber}
                    </h1>
                    <Badge variant={statusVariant[order.status]}>
                        {order.status.replace(/_/g, ' ')}
                    </Badge>
                </div>
                <p className="text-sm text-gray-500 mb-4">Created {fmtDate(order.createdAt)}</p>

                {/* Action buttons — wrap on mobile */}
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate('/sales-orders')}>
                        <ArrowLeft size={15} className="mr-1.5" /> Back
                    </Button>
                    {actionButtons.map((btn, idx) => (
                        <Button
                            key={btn.status || idx}
                            variant={btn.variant}
                            size="sm"
                            onClick={() => btn.onClick ? btn.onClick() : setAction(btn)}
                        >
                            <btn.icon size={15} className="mr-1.5" /> {btn.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* ─── MAIN LAYOUT: stacked on mobile, 3-col grid on lg ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* LEFT / MAIN COLUMN */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Customer & Delivery */}
                    <Card className="p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Customer &amp; Delivery</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
                                <p className="font-semibold text-gray-800">{order.customerSnapshot?.name}</p>
                                <p className="text-sm text-gray-500">{order.customerSnapshot?.code}</p>
                                {order.customerSnapshot?.taxRegistrationNumber && (
                                    <p className="text-sm text-gray-500">VAT: {order.customerSnapshot.taxRegistrationNumber}</p>
                                )}
                                {order.billingAddress && (
                                    <div className="text-sm text-gray-500 mt-1.5 leading-relaxed">
                                        {order.billingAddress.line1}
                                        {order.billingAddress.city && `, ${order.billingAddress.city}`}
                                        {order.billingAddress.postalCode && ` ${order.billingAddress.postalCode}`}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ship To</p>
                                {order.shippingAddress ? (
                                    <div className="text-sm text-gray-700 leading-relaxed">
                                        {order.shippingAddress.label && <p className="font-medium">{order.shippingAddress.label}</p>}
                                        <p>{order.shippingAddress.line1}</p>
                                        <p>
                                            {order.shippingAddress.city}
                                            {order.shippingAddress.postalCode && ` ${order.shippingAddress.postalCode}`}
                                        </p>
                                    </div>
                                ) : <p className="text-sm text-gray-400">—</p>}
                            </div>
                        </div>
                    </Card>

                    {/* Line Items */}
                    <Card>
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
                        </div>

                        {/* Desktop table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full min-w-[560px]">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Price</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Discount</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Tax</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {order.items.map((item) => (
                                        <tr key={item._id || item.lineNumber} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-5 py-3">
                                                <p className="font-medium text-sm text-gray-800">{item.productName}</p>
                                                <p className="text-xs text-gray-400 font-mono">{item.productCode}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-600 whitespace-nowrap">
                                                {item.orderedQuantity} {item.unitOfMeasure}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-700 whitespace-nowrap">{fmt(item.unitPrice)}</td>
                                            <td className="px-4 py-3 text-right text-sm text-red-500 whitespace-nowrap">
                                                {item.lineDiscount > 0 ? `-${fmt(item.lineDiscount)}` : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-600 whitespace-nowrap">{fmt(item.lineTax)}</td>
                                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800 whitespace-nowrap">{fmt(item.lineTotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile item cards */}
                        <div className="sm:hidden divide-y divide-gray-100">
                            {order.items.map((item) => (
                                <div key={item._id || item.lineNumber} className="px-4 py-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="font-semibold text-sm text-gray-800">{item.productName}</p>
                                            <p className="text-xs text-gray-400 font-mono mt-0.5">{item.productCode}</p>
                                        </div>
                                        <span className="text-sm font-bold text-gray-900 ml-2 flex-shrink-0">
                                            {fmt(item.lineTotal)}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                                        <div>
                                            <span className="block text-gray-400 uppercase text-[10px] mb-0.5">Qty</span>
                                            <span className="font-medium text-gray-700">{item.orderedQuantity} {item.unitOfMeasure}</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-400 uppercase text-[10px] mb-0.5">Price</span>
                                            <span className="font-medium text-gray-700">{fmt(item.unitPrice)}</span>
                                        </div>
                                        <div>
                                            <span className="block text-gray-400 uppercase text-[10px] mb-0.5">Tax</span>
                                            <span className="font-medium text-gray-700">{fmt(item.lineTax)}</span>
                                        </div>
                                    </div>
                                    {item.lineDiscount > 0 && (
                                        <p className="text-xs text-red-500 mt-2">
                                            Discount: -{fmt(item.lineDiscount)}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Notes */}
                    {(order.customerNotes || order.internalNotes) && (
                        <Card className="p-5">
                            <h3 className="text-sm font-semibold text-gray-700 mb-3">Notes</h3>
                            {order.customerNotes && (
                                <div className="mb-3">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Customer Notes</p>
                                    <p className="text-sm whitespace-pre-wrap text-gray-700">{order.customerNotes}</p>
                                </div>
                            )}
                            {order.internalNotes && (
                                <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Internal Notes</p>
                                    <p className="text-sm whitespace-pre-wrap bg-amber-50 border border-amber-100 p-3 rounded-lg text-amber-800">{order.internalNotes}</p>
                                </div>
                            )}
                        </Card>
                    )}
                </div>

                {/* RIGHT SIDEBAR */}
                <div className="space-y-5">

                    {/* Summary */}
                    <Card className="p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-2.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Subtotal</span>
                                <span className="font-medium">{fmt(order.subtotal)}</span>
                            </div>
                            {order.totalDiscount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Line Discounts</span>
                                    <span className="text-red-500 font-medium">-{fmt(order.totalDiscount)}</span>
                                </div>
                            )}
                            {order.orderDiscount?.amount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Order Discount</span>
                                    <span className="text-red-500 font-medium">-{fmt(order.orderDiscount.amount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-500">Tax (VAT)</span>
                                <span className="font-medium">{fmt(order.totalTax)}</span>
                            </div>
                            {order.shippingCost > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Shipping</span>
                                    <span className="font-medium">{fmt(order.shippingCost)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-3 border-t border-gray-100 font-bold text-base">
                                <span>Total</span>
                                <span className="text-primary-600">{fmt(order.grandTotal)}</span>
                            </div>
                        </div>
                    </Card>

                    {/* Order Details */}
                    <Card className="p-5">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Details</h3>
                        <div className="space-y-2.5 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500 flex-shrink-0">Order Date</span>
                                <span className="text-right">{fmtDate(order.orderDate)}</span>
                            </div>
                            {order.requestedDeliveryDate && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500 flex-shrink-0">Req. Delivery</span>
                                    <span className="text-right">{fmtDate(order.requestedDeliveryDate)}</span>
                                </div>
                            )}
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500 flex-shrink-0">Priority</span>
                                <span className="capitalize text-right">{order.priority}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500 flex-shrink-0">Payment</span>
                                <span className="uppercase text-xs font-semibold text-right">{order.paymentTerms?.type}</span>
                            </div>
                            {order.paymentTerms?.type === 'credit' && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500 flex-shrink-0">Due Date</span>
                                    <span className="text-right">{fmtDate(order.paymentTerms?.dueDate)}</span>
                                </div>
                            )}
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500 flex-shrink-0">Sales Rep</span>
                                <span className="text-right">
                                    {order.salesRepId ? `${order.salesRepId.firstName} ${order.salesRepId.lastName}` : '—'}
                                </span>
                            </div>
                            <div className="flex justify-between gap-4">
                                <span className="text-gray-500 flex-shrink-0">Source</span>
                                <span className="capitalize text-right">{order.source}</span>
                            </div>
                            {order.sourceWarehouseSnapshot?.name && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-500 flex-shrink-0">Warehouse</span>
                                    <span className="text-right">{order.sourceWarehouseSnapshot.name}</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Credit Check */}
                    {order.creditCheck?.performed && (
                        <Card className={`p-5 border-l-4 ${order.creditCheck.passed ? 'border-l-green-500' : 'border-l-amber-500'}`}>
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Credit Check</h3>
                            <div className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Required</span>
                                    <span>{fmt(order.creditCheck.creditRequired)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Available</span>
                                    <span>{fmt(order.creditCheck.creditAvailable)}</span>
                                </div>
                                <p className={`font-semibold mt-1 ${order.creditCheck.passed ? 'text-green-600' : 'text-amber-600'}`}>
                                    {order.creditCheck.passed ? '✓ Passed' : '⚠ Exceeded'}
                                </p>
                                {order.creditCheck.overridden && (
                                    <p className="text-xs text-gray-400 mt-1">Override: {order.creditCheck.overrideReason}</p>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* On Hold */}
                    {order.holdReason && (
                        <Card className="p-5 border-l-4 border-l-amber-500 bg-amber-50">
                            <h3 className="text-sm font-semibold text-amber-800 mb-1">On Hold</h3>
                            <p className="text-sm text-amber-700">{order.holdReason}</p>
                        </Card>
                    )}

                    {/* Cancelled */}
                    {order.cancelledAt && (
                        <Card className="p-5 border-l-4 border-l-red-500 bg-red-50">
                            <h3 className="text-sm font-semibold text-red-800 mb-1">Cancelled</h3>
                            <p className="text-sm text-red-700">{order.cancellationReason}</p>
                            <p className="text-xs text-red-500 mt-1">
                                By {order.cancelledBy?.firstName} on {fmtDate(order.cancelledAt)}
                            </p>
                        </Card>
                    )}
                </div>
            </div>

            {/* ─── CONFIRM DIALOG ─── */}
            <ConfirmDialog
                isOpen={!!action}
                onClose={() => { setAction(null); setReason(''); }}
                onConfirm={handleAction}
                title={action?.label}
                message={
                    action?.needsReason ? (
                        <div>
                            <p className="mb-3">Please provide a reason:</p>
                            <textarea
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Enter reason..."
                            />
                        </div>
                    ) : `Are you sure you want to ${action?.label?.toLowerCase()} this order?`
                }
                confirmText={action?.label}
                variant={action?.variant === 'danger' ? 'danger' : 'primary'}
                loading={changeStatus.isPending}
            />
        </div>
    );
}