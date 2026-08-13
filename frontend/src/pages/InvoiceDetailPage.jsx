import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Ban, Printer, Receipt, Download, Eye, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useInvoice, useChangeInvoiceStatus } from '../features/invoices/useInvoices';
import { useSettings } from '../features/settings/useSettings';
import { useAuthStore } from '../store/authStore';
import CustomerQuotationView from '../components/aluminium/CustomerQuotationView';
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
    const [activeTab, setActiveTab] = useState('preview'); // 'preview' or 'details'

    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const { data, isLoading } = useInvoice(id);
    const changeStatus = useChangeInvoiceStatus();
    const inv = data?.data;

    // View Options State
    const [includeVat, setIncludeVat] = useState(true);
    const [distributeTransportCost, setDistributeTransportCost] = useState(false);
    const [customTerms, setCustomTerms] = useState('');

    const printRef = useRef();

    // Sync options when invoice loads
    if (inv && includeVat === true && inv.includeVat !== undefined && includeVat !== inv.includeVat) {
        setIncludeVat(inv.includeVat);
    }
    if (inv && distributeTransportCost === false && inv.distributeTransportCost !== undefined && distributeTransportCost !== inv.distributeTransportCost) {
        setDistributeTransportCost(inv.distributeTransportCost);
    }
    if (inv && !customTerms && inv.termsAndConditions) {
        setCustomTerms(inv.termsAndConditions);
    }

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

    const handleDownloadPDF = async () => {
        const element = document.getElementById('customer-quotation-view-doc');
        if (!element) {
            toast.error('Invoice document element not ready');
            return;
        }

        try {
            const toastId = toast.loading('Generating Invoice PDF...');

            const canvas = await html2canvas(element, {
                scale: 3,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                allowTaint: true,
                onclone: (clonedDoc) => {
                    clonedDoc.querySelectorAll('[data-pdf-badge="main"]').forEach(el => {
                        el.style.paddingTop = '1px';
                        el.style.paddingBottom = '6px';
                        el.style.lineHeight = '1';
                    });
                    clonedDoc.querySelectorAll('[data-pdf-badge="card"]').forEach(el => {
                        el.style.paddingTop = '1px';
                        el.style.paddingBottom = '5px';
                        el.style.lineHeight = '1';
                    });
                    clonedDoc.querySelectorAll('[data-pdf-badge="circle"]').forEach(el => {
                        el.style.paddingTop = '0px';
                        el.style.paddingBottom = '4px';
                        el.style.lineHeight = '1';
                    });
                    clonedDoc.querySelectorAll('[data-pdf-badge="seal"]').forEach(el => {
                        el.style.paddingTop = '1px';
                        el.style.paddingBottom = '4px';
                        el.style.lineHeight = '1';
                    });
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfPageW = pdf.internal.pageSize.getWidth();
            const pdfPageH = pdf.internal.pageSize.getHeight();
            const naturalH = (canvas.height * pdfPageW) / canvas.width;

            if (naturalH <= pdfPageH) {
                pdf.addImage(imgData, 'PNG', 0, 0, pdfPageW, naturalH);
            } else {
                const scaleFactor = pdfPageH / naturalH;
                const scaledW = pdfPageW * scaleFactor;
                const xOffset = (pdfPageW - scaledW) / 2;
                pdf.addImage(imgData, 'PNG', xOffset, 0, scaledW, pdfPageH);
            }

            pdf.save(`ALUECO_Invoice_${inv.invoiceNumber}.pdf`);
            toast.success('Invoice PDF Downloaded Successfully!', { id: toastId });
        } catch (err) {
            console.error('PDF export error:', err);
            toast.error('Failed to export Invoice PDF');
        }
    };

    const companyInfo = {
        name: settings?.companyName || 'ALUECO ALUMINIUM SYSTEMS',
        address: settings?.companyAddress || 'No. 123, Negoda Road, Weliweriya, Sri Lanka.',
        taxNumber: settings?.taxId || 'VAT-123456789',
        phone: settings?.companyPhone || '0777 140 680',
        email: settings?.companyEmail || 'info@alueco.lk',
        website: settings?.companyWebsite || 'www.alueco.lk',
        logo: settings?.companyLogo,
        secondaryLogo: settings?.secondaryLogo
    };

    return (
        <div className="space-y-6">
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
                            <Printer size={16} className="mr-1.5" /> Print Invoice
                        </Button>
                        <Button className="bg-[#064E3B] hover:bg-emerald-900 text-white font-bold" onClick={handleDownloadPDF}>
                            <Download size={16} className="mr-1.5" /> Download PDF
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

            {/* View Mode & Document Controls */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-4">
                <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('preview')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition ${activeTab === 'preview' ? 'bg-white text-[#064E3B] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <Eye size={14} /> Official Invoice Document View
                    </button>
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold text-xs transition ${activeTab === 'details' ? 'bg-white text-[#064E3B] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                        <FileText size={14} /> System Details &amp; Accounting
                    </button>
                </div>

                {/* Display Customization Toggles */}
                <div className="flex items-center gap-4 flex-wrap text-xs font-semibold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <input
                            type="checkbox"
                            checked={includeVat}
                            onChange={(e) => setIncludeVat(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Include 18% VAT</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <input
                            type="checkbox"
                            checked={distributeTransportCost}
                            onChange={(e) => setDistributeTransportCost(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Distribute Shipping into Items</span>
                    </label>
                </div>
            </div>

            {/* Main Content Area */}
            {activeTab === 'preview' ? (
                <div className="py-2 overflow-x-auto">
                    <CustomerQuotationView
                        invoice={inv}
                        type="INVOICE"
                        settings={settings}
                        options={{
                            includeVat,
                            distributeTransportCost,
                            customTerms
                        }}
                    />
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-2 space-y-6">
                        <Card className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Customer Details</h3>
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

                        <Card className="p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Custom Terms &amp; Notes</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Terms &amp; Conditions</label>
                                    <textarea
                                        rows={3}
                                        value={customTerms}
                                        onChange={(e) => setCustomTerms(e.target.value)}
                                        placeholder="Enter custom terms & conditions for this invoice..."
                                        className="w-full border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-600"
                                    />
                                </div>
                                {inv.notes && (
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
                                        <p className="text-sm whitespace-pre-wrap">{inv.notes}</p>
                                    </div>
                                )}
                            </div>
                        </Card>
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
                    </div>
                </div>
            )}

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

            {/* Hidden Print Container */}
            <div className="hidden print:block">
                <PrintableInvoice
                    ref={printRef}
                    companyInfo={companyInfo}
                    invoice={inv}
                    payments={payments}
                    options={{
                        includeVat,
                        distributeTransportCost,
                        customTerms
                    }}
                />
            </div>
        </div>
    );
}