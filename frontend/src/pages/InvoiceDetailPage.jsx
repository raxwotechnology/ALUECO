import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Ban, Printer, Receipt } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useInvoice, useChangeInvoiceStatus } from '../features/invoices/useInvoices';
import { useAuthStore } from '../store/authStore';

import { useRef } from 'react';
import PrintableInvoice from '../components/print/PrintableInvoice';
import { useQuery } from '@tanstack/react-query';
import { paymentsApi } from '../features/payments/paymentsApi';

const paymentStatusVariant = {
    unpaid: 'warning', partially_paid: 'info', paid: 'success',
    overdue: 'danger', cancelled: 'default', written_off: 'default',
};

export default function InvoiceDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [action, setAction] = useState(null);
    const [reason, setReason] = useState('');

    const { data, isLoading } = useInvoice(id);
    const changeStatus = useChangeInvoiceStatus();
    const inv = data?.data;

    const printRef = useRef();

    // Fetch payments allocated to this invoice
    const { data: paymentsData } = useQuery({
        queryKey: ['paymentsForInvoice', inv?._id],
        queryFn: () => paymentsApi.list({
            documentId: inv?._id,
            limit: 50,
        }),
        enabled: !!inv?._id,
    });

    const payments = paymentsData?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    if (isLoading || !inv) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    const canCancel = ['admin', 'manager', 'accountant'].includes(user.role);
    const canSend = ['admin', 'manager', 'accountant', 'sales_manager'].includes(user.role);

    const actions = [];
    if (inv.status === 'approved' && canSend) {
        actions.push({ label: 'Mark Sent', icon: Send, variant: 'primary', status: 'sent' });
    }
    if (['approved', 'sent'].includes(inv.status) && inv.paymentStatus !== 'paid' && canCancel) {
        actions.push({ label: 'Cancel', icon: Ban, variant: 'danger', status: 'cancelled', needsReason: true });
    }

    const handleAction = async () => {
        await changeStatus.mutateAsync({ id: inv._id, status: action.status, reason });
        setAction(null); setReason('');
    };

    const handlePrint = () => {
        window.print();
    };

    // Hard-code your company info for now (we'll move to settings later)
    const companyInfo = {
        name: 'Your Company Name',
        address: 'Your Street, City',
        taxNumber: 'TAX-12345',
        phone: '+94 11 XXX XXXX',
        email: 'info@yourcompany.lk',
    };

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">
                    Invoice {inv.invoiceNumber}
                    <Badge variant={paymentStatusVariant[inv.paymentStatus]}>{inv.paymentStatus.replace('_', ' ')}</Badge>
                    {inv.daysPastDue > 0 && <Badge variant="danger">{inv.daysPastDue}d overdue</Badge>}
                </span>}
                description={`Issued ${fmtDate(inv.invoiceDate)} · Due ${fmtDate(inv.dueDate)}`}
                actions={
                    <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" onClick={() => navigate('/invoices')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer size={16} className="mr-1.5" /> Print
                        </Button>
                        {inv.balanceDue > 0 && inv.paymentStatus !== 'cancelled' && (
                            <Button variant="outline" onClick={() => navigate(`/payments/new?invoiceId=${inv._id}`)}>
                                <Receipt size={16} className="mr-1.5" /> Record Payment
                            </Button>
                        )}
                        {actions.map((a) => (
                            <Button key={a.label} variant={a.variant} onClick={() => setAction(a)}>
                                <a.icon size={16} className="mr-1.5" /> {a.label}
                            </Button>
                        ))}
                    </div>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Customer</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Bill To</p>
                                <p className="font-medium">{inv.customerSnapshot?.name}</p>
                                <p className="text-sm text-gray-600">{inv.customerSnapshot?.code}</p>
                                {inv.customerSnapshot?.taxRegistrationNumber && (
                                    <p className="text-sm text-gray-600">VAT: {inv.customerSnapshot.taxRegistrationNumber}</p>
                                )}
                                {inv.billingAddress && (
                                    <div className="text-sm text-gray-600 mt-2">
                                        {inv.billingAddress.line1}
                                        {inv.billingAddress.city && <br />}
                                        {inv.billingAddress.city}{inv.billingAddress.postalCode && ` ${inv.billingAddress.postalCode}`}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Payment Terms</p>
                                <p className="text-sm">
                                    {['cod', 'cash'].includes(inv.paymentTerms?.type?.toLowerCase()) ? 'CASH' : inv.paymentTerms?.type?.toUpperCase()}
                                    {inv.paymentTerms?.type === 'credit' && ` (${inv.paymentTerms.creditDays} days)`}
                                </p>
                                {inv.salesOrderNumbers?.length > 0 && (
                                    <>
                                        <p className="text-xs text-gray-500 uppercase mt-3 mb-1">Related Orders</p>
                                        <div className="text-sm">
                                            {inv.salesOrderNumbers.map((n) => (
                                                <span key={n} className="inline-block mr-2 font-mono">{n}</span>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="px-6 py-4 border-b">
                            <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
                        </div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Item</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Price</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Tax</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {inv.items.map((item) => (
                                    <tr key={item._id || item.lineNumber}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm">{item.productName}</p>
                                            {item.productCode && <p className="text-xs text-gray-500 font-mono">{item.productCode}</p>}
                                            {item.description && <p className="text-xs text-gray-600 mt-1">{item.description}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">{item.quantity} {item.unitOfMeasure}</td>
                                        <td className="px-4 py-3 text-right text-sm">{fmt(item.unitPrice)}</td>
                                        <td className="px-4 py-3 text-right text-sm">{fmt(item.lineTax)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium">{fmt(item.lineTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>

                    {(inv.notes || inv.paymentInstructions) && (
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                            {inv.notes && (
                                <div className="mb-3">
                                    <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
                                    <p className="text-sm whitespace-pre-wrap">{inv.notes}</p>
                                </div>
                            )}
                            {inv.paymentInstructions && (
                                <div>
                                    <p className="text-xs text-gray-500 uppercase mb-1">Payment Instructions</p>
                                    <p className="text-sm whitespace-pre-wrap bg-blue-50 p-2 rounded">{inv.paymentInstructions}</p>
                                </div>
                            )}
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{fmt(inv.subtotal)}</span></div>
                            {inv.totalDiscount > 0 && (
                                <div className="flex justify-between"><span className="text-gray-600">Discount</span><span className="text-red-600">-{fmt(inv.totalDiscount)}</span></div>
                            )}
                            <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>{fmt(inv.totalTax)}</span></div>
                            {inv.shippingCost > 0 && (
                                <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{fmt(inv.shippingCost)}</span></div>
                            )}
                            <div className="flex justify-between pt-3 border-t">
                                <span className="font-semibold">Total</span>
                                <span className="font-bold">{fmt(inv.grandTotal)}</span>
                            </div>
                            <div className="flex justify-between pt-2">
                                <span className="text-gray-600">Paid</span>
                                <span className="text-green-600">-{fmt(inv.amountPaid)}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="font-semibold">Balance Due</span>
                                <span className={`font-bold text-lg ${inv.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {fmt(inv.balanceDue)}
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Details</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-500">Invoice Date</span><span>{fmtDate(inv.invoiceDate)}</span></div>
                            {inv.dueDate && <div className="flex justify-between"><span className="text-gray-500">Due Date</span><span>{fmtDate(inv.dueDate)}</span></div>}
                            <div className="flex justify-between"><span className="text-gray-500">Type</span><span className="capitalize">{inv.invoiceType}</span></div>
                            {inv.daysOutstanding > 0 && (
                                <div className="flex justify-between"><span className="text-gray-500">Days outstanding</span><span>{inv.daysOutstanding}</span></div>
                            )}
                            {inv.salesRepId && (
                                <div className="flex justify-between"><span className="text-gray-500">Sales Rep</span>
                                    <span>{inv.salesRepId.firstName} {inv.salesRepId.lastName}</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {inv.lastPaymentDate && (
                        <Card className="p-6 border-l-4 border-l-green-500">
                            <h3 className="text-sm font-semibold text-gray-700 mb-1">Last Payment</h3>
                            <p className="text-sm">{fmtDate(inv.lastPaymentDate)}</p>
                            {inv.fullyPaidAt && <p className="text-xs text-green-600 mt-1">Fully paid on {fmtDate(inv.fullyPaidAt)}</p>}
                        </Card>
                    )}

                    {inv.cancelledAt && (
                        <Card className="p-6 border-l-4 border-l-red-500 bg-red-50">
                            <h3 className="text-sm font-semibold text-red-800 mb-1">Cancelled</h3>
                            <p className="text-sm text-red-700">{inv.cancellationReason}</p>
                            <p className="text-xs text-red-600 mt-1">By {inv.cancelledBy?.firstName} on {fmtDate(inv.cancelledAt)}</p>
                        </Card>
                    )}
                </div>
            </div>

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
                    ) : `${action?.label} this invoice?`
                }
                confirmText={action?.label}
                variant={action?.variant === 'danger' ? 'danger' : 'primary'}
                loading={changeStatus.isPending}
            />

            <div className="hidden print:block">
                <PrintableInvoice
                    ref={printRef}
                    companyInfo={companyInfo}
                    invoice={inv}
                    payments={payments}
                />
            </div>
        </div>
    );
}