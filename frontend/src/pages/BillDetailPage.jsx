import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Receipt, Download } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useBill } from '../features/bills/useBills';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../features/settings/useSettings';

const statusVariant = {
    unpaid: 'warning', partially_paid: 'info', paid: 'success',
    overdue: 'danger', cancelled: 'default', disputed: 'danger',
};

export default function BillDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;
    const { data, isLoading } = useBill(id);
    const bill = data?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK') : '—';

    const handleDownloadPDF = () => {
        if (!bill) return;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.width;
        
        // 1. Header (Primary Accent)
        doc.setFillColor(79, 70, 229); // Indigo 600
        doc.rect(0, 0, pageWidth, 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text((settings?.companyName || 'EXPORT LANKA').toUpperCase(), 14, 18);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(settings?.companyAddress || 'Colombo, Sri Lanka', 14, 25);
        
        const contactInfo = [
            settings?.companyPhone ? `Tel: ${settings.companyPhone}` : '',
            settings?.companyEmail ? `Email: ${settings.companyEmail}` : ''
        ].filter(Boolean).join(' | ') || 'info@exportlanka.com';
        doc.text(contactInfo, 14, 30);

        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('VENDOR BILL', pageWidth - 14, 20, { align: 'right' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Bill Ref: ${bill.billNumber}`, pageWidth - 14, 28, { align: 'right' });
        doc.text(`Status: ${bill.paymentStatus.toUpperCase()}`, pageWidth - 14, 33, { align: 'right' });

        // 2. Bill Meta Info (Supplier Details & Dates)
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('VENDOR / SUPPLIER', 14, 52);
        
        doc.setFont('helvetica', 'normal');
        doc.text([
            bill.supplierSnapshot?.name || 'Unknown Supplier',
            `Code: ${bill.supplierSnapshot?.code || 'SUP'}`,
            bill.supplierSnapshot?.taxRegistrationNumber ? `VAT No: ${bill.supplierSnapshot.taxRegistrationNumber}` : ''
        ].filter(Boolean), 14, 58);

        doc.setFont('helvetica', 'bold');
        doc.text('BILL DETAILS', pageWidth - 14, 52, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        doc.text([
            `Bill Date: ${fmtDate(bill.billDate)}`,
            `Due Date: ${fmtDate(bill.dueDate)}`,
            bill.supplierInvoiceNumber ? `Supplier Invoice #: ${bill.supplierInvoiceNumber}` : '',
            bill.paymentTerms?.type ? `Terms: ${bill.paymentTerms.type.toUpperCase()}` : ''
        ].filter(Boolean), pageWidth - 14, 58, { align: 'right' });

        // Divider
        doc.setDrawColor(220, 220, 220);
        doc.line(14, 78, pageWidth - 14, 78);

        // 3. Line Items Table
        const columns = ['#', 'Item / Product', 'Qty', 'Unit Price (LKR)', 'Total (LKR)'];
        const rows = bill.items.map((item, idx) => [
            idx + 1,
            `${item.productName} (${item.productCode || 'N/A'})`,
            item.quantity,
            item.unitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 }),
            item.lineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2 })
        ]);

        autoTable(doc, {
            startY: 85,
            head: [columns],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { width: 10 },
                2: { halign: 'right' },
                3: { halign: 'right', fontStyle: 'normal' },
                4: { halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 }
        });

        const finalY = doc.lastAutoTable.finalY + 10;

        // 4. Summary Totals (Right side)
        const summaryX = pageWidth - 90;
        doc.setFontSize(10);
        
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', summaryX, finalY);
        doc.text(fmt(bill.subtotal).replace('LKR', ''), pageWidth - 14, finalY, { align: 'right' });

        doc.text('Tax Amount:', summaryX, finalY + 6);
        doc.text(fmt(bill.totalTax).replace('LKR', ''), pageWidth - 14, finalY + 6, { align: 'right' });

        if (bill.shippingCost > 0) {
            doc.text('Shipping:', summaryX, finalY + 12);
            doc.text(fmt(bill.shippingCost).replace('LKR', ''), pageWidth - 14, finalY + 12, { align: 'right' });
        }

        const grandTotalY = finalY + (bill.shippingCost > 0 ? 18 : 12);
        doc.setFont('helvetica', 'bold');
        doc.text('Grand Total:', summaryX, grandTotalY);
        doc.text(fmt(bill.grandTotal).replace('LKR', ''), pageWidth - 14, grandTotalY, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.text('Amount Paid:', summaryX, grandTotalY + 6);
        doc.text(`-${fmt(bill.amountPaid).replace('LKR', '')}`, pageWidth - 14, grandTotalY + 6, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.setFillColor(243, 244, 246);
        doc.rect(summaryX - 2, grandTotalY + 10, 92 - 14 + 16, 8, 'F');
        doc.text('Balance Due:', summaryX, grandTotalY + 15);
        doc.text(fmt(bill.balanceDue).replace('LKR', ''), pageWidth - 14, grandTotalY + 15, { align: 'right' });

        // 5. Signature Boxes (Bottom of page)
        const bottomY = doc.internal.pageSize.height - 35;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, bottomY, 64, bottomY);
        doc.line(pageWidth - 64, bottomY, pageWidth - 14, bottomY);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Prepared By / Warehouse Clerk', 39, bottomY + 5, { align: 'center' });
        doc.text('Authorized Signatory', pageWidth - 39, bottomY + 5, { align: 'center' });

        doc.save(`Bill_${bill.billNumber}.pdf`);
    };

    if (isLoading || !bill) return <div className="py-16 text-center text-gray-500">Loading...</div>;

    return (
        <div>
            <PageHeader
                title={<span className="flex items-center gap-3">
                    Bill {bill.billNumber}
                    <Badge variant={statusVariant[bill.paymentStatus]}>{bill.paymentStatus.replace('_', ' ')}</Badge>
                    {bill.daysPastDue > 0 && <Badge variant="danger">{bill.daysPastDue}d late</Badge>}
                </span>}
                description={`${fmtDate(bill.billDate)} · Due ${fmtDate(bill.dueDate)}`}
                actions={
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/bills')}>
                            <ArrowLeft size={16} className="mr-1.5" /> Back
                        </Button>
                        <Button variant="outline" onClick={handleDownloadPDF}>
                            <Download size={16} className="mr-1.5" /> Download PDF
                        </Button>
                        {bill.balanceDue > 0 && (
                            <Button variant="primary" onClick={() => navigate(`/payments/new?billId=${bill._id}`)}>
                                <Receipt size={16} className="mr-1.5" /> Record Payment
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Supplier</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-gray-500 uppercase mb-1">Vendor</p>
                                <p className="font-medium">{bill.supplierSnapshot?.name}</p>
                                <p className="text-sm text-gray-600">{bill.supplierSnapshot?.code}</p>
                                {bill.supplierSnapshot?.taxRegistrationNumber && (
                                    <p className="text-sm text-gray-600">VAT: {bill.supplierSnapshot.taxRegistrationNumber}</p>
                                )}
                            </div>
                            <div>
                                {bill.supplierInvoiceNumber && (
                                    <>
                                        <p className="text-xs text-gray-500 uppercase mb-1">Supplier Invoice #</p>
                                        <p className="font-mono text-sm">{bill.supplierInvoiceNumber}</p>
                                    </>
                                )}
                                {bill.grnNumbers?.length > 0 && (
                                    <>
                                        <p className="text-xs text-gray-500 uppercase mt-3 mb-1">Related GRNs</p>
                                        <div className="text-sm">
                                            {bill.grnNumbers.map((n) => <span key={n} className="mr-2 font-mono">{n}</span>)}
                                        </div>
                                    </>
                                )}
                                {bill.purchaseOrderNumbers?.length > 0 && (
                                    <>
                                        <p className="text-xs text-gray-500 uppercase mt-3 mb-1">Related POs</p>
                                        <div className="text-sm">
                                            {bill.purchaseOrderNumbers.map((n) => <span key={n} className="mr-2 font-mono">{n}</span>)}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className="px-6 py-4 border-b"><h3 className="text-sm font-semibold text-gray-700">Items</h3></div>
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Item</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Qty</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Price</th>
                                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {bill.items.map((item) => (
                                    <tr key={item._id || item.lineNumber}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm">{item.productName}</p>
                                            {item.productCode && <p className="text-xs font-mono text-gray-500">{item.productCode}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right text-sm">{fmt(item.unitPrice)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium">{fmt(item.lineTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{fmt(bill.subtotal)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>{fmt(bill.totalTax)}</span></div>
                            {bill.shippingCost > 0 && <div className="flex justify-between"><span className="text-gray-600">Shipping</span><span>{fmt(bill.shippingCost)}</span></div>}
                            <div className="flex justify-between pt-3 border-t"><span className="font-semibold">Total</span><span className="font-bold">{fmt(bill.grandTotal)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Paid</span><span className="text-green-600">-{fmt(bill.amountPaid)}</span></div>
                            <div className="flex justify-between pt-2 border-t">
                                <span className="font-semibold">Balance Due</span>
                                <span className={`font-bold text-lg ${bill.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {fmt(bill.balanceDue)}
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}