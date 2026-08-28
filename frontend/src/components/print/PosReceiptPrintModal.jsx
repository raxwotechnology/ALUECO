import React, { useState, useRef } from 'react';
import { Printer, FileText, CheckCircle, ShoppingBag, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import WarrantyTermsPrint from './WarrantyTermsPrint';

const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

// Add print-specific styles
const printStyles = `
    @media print {
        body * {
            visibility: hidden;
        }
        .pos-receipt-print-area, .pos-receipt-print-area * {
            visibility: visible;
        }
        .pos-receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
        }
        .no-print {
            display: none !important;
        }
    }
`;

export default function PosReceiptPrintModal({
    isOpen,
    onClose,
    order,
    invoice,
    customer,
    cart = [],
    paymentDetails = {},
    onNewSale,
}) {
    const [activeTab, setActiveTab] = useState('thermal'); // 'thermal' | 'a4'
    const printAreaRef = useRef(null);

    if (!order && !invoice && (!cart || cart.length === 0)) return null;

    const docNumber = invoice?.invoiceNumber || order?.orderNumber || 'POS-RECEIPT';
    const dateStr = new Date().toLocaleString('en-LK', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

    const itemsList = (order?.items || invoice?.items || cart || []).map((item) => ({
        name: item.productName || item.name,
        code: item.productCode || item.code,
        qty: item.orderedQuantity || item.quantity || item.qty || 1,
        unitPrice: item.unitPrice || item.price || 0,
        total: item.lineTotal || ((item.orderedQuantity || item.quantity || item.qty || 1) * (item.unitPrice || item.price || 0)),
        unitOfMeasure: item.unitOfMeasure || '',
    }));

    const subtotal = order?.subtotal || invoice?.subtotal || itemsList.reduce((sum, i) => sum + i.total, 0);
    const tax = order?.totalTax || invoice?.totalTax || 0;
    const discount = order?.totalDiscount || order?.orderDiscount?.amount || invoice?.totalDiscount || 0;
    const grandTotal = order?.grandTotal || invoice?.grandTotal || (subtotal - discount + tax);
    
    const advancePaid = paymentDetails?.advancePaidAmount || order?.advancePaidAmount || invoice?.amountPaid || grandTotal;
    const balanceDue = paymentDetails?.pendingBalance !== undefined 
        ? paymentDetails.pendingBalance 
        : (order?.pendingBalance !== undefined ? order.pendingBalance : Math.max(0, grandTotal - advancePaid));

    const paymentMethodLabel = paymentDetails?.paymentMethod === 'advance' 
        ? 'ADVANCE PAYMENT' 
        : (paymentDetails?.paymentMethod || order?.paymentTerms?.type || 'CASH').toUpperCase();

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <style>{printStyles}</style>
            <Modal isOpen={isOpen} onClose={onClose} title="POS Sale Completed — Invoice & Receipt Print" size="2xl">
            {/* Action Bar */}
            <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 rounded-t-xl no-print">
                <div className="flex items-center gap-2">
                    <CheckCircle className="text-emerald-400" size={24} />
                    <div>
                        <h3 className="font-bold text-base leading-tight">Sale Successfully Recorded!</h3>
                        <p className="text-xs text-slate-300">Document #{docNumber} · Total: {fmt(grandTotal)}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                        <button
                            type="button"
                            onClick={() => setActiveTab('thermal')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'thermal' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            Thermal (80mm)
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('a4')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'a4' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            A4 Invoice
                        </button>
                    </div>

                    <Button variant="primary" size="sm" onClick={handlePrint}>
                        <Printer size={15} className="mr-1.5" /> Print Now
                    </Button>
                </div>
            </div>

            {/* Print Body */}
            <div className="p-6 bg-slate-100 max-h-[70vh] overflow-y-auto no-print">
                
                {/* ─── THERMAL RECEIPT VIEW (80mm) ─── */}
                {activeTab === 'thermal' && (
                    <div className="flex justify-center">
                        <div
                            ref={printAreaRef}
                            className="pos-receipt-print-area w-[340px] bg-white p-5 shadow-xl border border-slate-200 text-slate-900 font-mono text-xs leading-snug print:w-full print:shadow-none print:border-none"
                        >
                            <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
                                <h2 className="font-black text-base text-slate-900 tracking-wider">ALUECO ALUMINIUM SYSTEMS</h2>
                                <p className="text-[10px] text-slate-600 uppercase font-sans font-semibold">Premium Fabrication &amp; Profiles</p>
                                <p className="text-[10px] text-slate-500 font-sans mt-0.5">123 Industrial Zone, Colombo, Sri Lanka</p>
                                <p className="text-[10px] text-slate-500 font-sans">Tel: +94 11 234 5678 | Tax: VAT-123456789</p>
                            </div>

                            <div className="border-b border-dashed border-slate-400 pb-2 mb-3 text-[10px] space-y-1">
                                <div className="flex justify-between"><span>RECEIPT #:</span><span className="font-bold">{docNumber}</span></div>
                                <div className="flex justify-between"><span>DATE/TIME:</span><span>{dateStr}</span></div>
                                {customer?.displayName && (
                                    <div className="flex justify-between"><span>CUSTOMER:</span><span className="font-bold truncate max-w-[180px]">{customer.displayName}</span></div>
                                )}
                                <div className="flex justify-between"><span>PAYMENT METHOD:</span><span className="font-bold">{paymentMethodLabel}</span></div>
                            </div>

                            {/* Itemized list */}
                            <div className="border-b border-dashed border-slate-400 pb-2 mb-3">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-300 text-[10px] uppercase font-bold">
                                            <th className="py-1">ITEM</th>
                                            <th className="py-1 text-center">QTY</th>
                                            <th className="py-1 text-right">TOTAL</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-[11px]">
                                        {itemsList.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="py-1.5 pr-1">
                                                    <div className="font-bold leading-tight">{item.name}</div>
                                                    <div className="text-[9px] text-slate-500">@{fmt(item.unitPrice)}</div>
                                                </td>
                                                <td className="py-1.5 text-center font-bold">{item.qty}</td>
                                                <td className="py-1.5 text-right font-bold">{fmt(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals */}
                            <div className="space-y-1 text-xs border-b border-dashed border-slate-400 pb-3 mb-3">
                                <div className="flex justify-between"><span>Subtotal:</span><span>{fmt(subtotal)}</span></div>
                                {discount > 0 && <div className="flex justify-between text-rose-700"><span>Discount:</span><span>-{fmt(discount)}</span></div>}
                                {tax > 0 && <div className="flex justify-between"><span>Tax (VAT):</span><span>{fmt(tax)}</span></div>}
                                <div className="flex justify-between font-extrabold text-sm border-t border-slate-300 pt-1">
                                    <span>GRAND TOTAL:</span><span>{fmt(grandTotal)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200 pt-1">
                                    <span>ADVANCE PAID:</span><span>{fmt(advancePaid)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-rose-700">
                                    <span>BALANCE DUE:</span><span>{fmt(balanceDue)}</span>
                                </div>
                            </div>

                            {/* Compact Warranty Summary */}
                            <WarrantyTermsPrint compact={true} />

                            <div className="text-center text-[10px] text-slate-500 mt-4 pt-2 border-t border-slate-200">
                                <p className="font-bold text-slate-700">Thank you for choosing ALUECO SYSTEMS!</p>
                                <p>Computer Generated POS Receipt</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── A4 LETTERHEAD INVOICE VIEW ─── */}
                {activeTab === 'a4' && (
                    <div className="bg-white p-8 shadow-xl max-w-[760px] mx-auto text-slate-900 font-sans text-xs">
                        {/* Header */}
                        <div className="flex justify-between items-start pb-4 border-b-2 border-indigo-950 mb-6">
                            <div>
                                <h1 className="text-2xl font-black text-indigo-950 tracking-wider">ALUECO ALUMINIUM SYSTEMS</h1>
                                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-0.5">Premium Aluminium Fabrication &amp; ERP Systems</p>
                                <p className="text-slate-500 text-[10px] mt-1">123 Industrial Zone, Colombo, Sri Lanka | Tel: +94 11 234 5678 | Email: info@alueco.lk</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-black text-indigo-900">POS INVOICE</h2>
                                <p className="font-mono text-sm font-bold text-slate-800">#{docNumber}</p>
                                <p className="text-slate-500 text-[10px] mt-0.5">Date: {dateStr}</p>
                            </div>
                        </div>

                        {/* Customer & Delivery */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bill To Customer</p>
                                <p className="font-bold text-sm text-slate-900 mt-0.5">{customer?.displayName || customer?.name || 'Walk-in Customer'}</p>
                                {customer?.customerCode && <p className="text-slate-600">{customer.customerCode}</p>}
                                {customer?.primaryContact?.phone && <p className="text-slate-600">Tel: {customer.primaryContact.phone}</p>}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Details</p>
                                <p className="font-semibold text-slate-800 mt-0.5">Method: {paymentMethodLabel}</p>
                                <p className="text-slate-600">Status: {balanceDue <= 0 ? 'FULLY PAID' : 'PARTIALLY PAID / ADVANCE'}</p>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full mb-6 border border-slate-200 rounded-lg overflow-hidden">
                            <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                                <tr>
                                    <th className="p-2.5 text-left">#</th>
                                    <th className="p-2.5 text-left">Product</th>
                                    <th className="p-2.5 text-right">Qty</th>
                                    <th className="p-2.5 text-right">Unit Price</th>
                                    <th className="p-2.5 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {itemsList.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                                        <td className="p-2.5">
                                            <p className="font-bold text-slate-900">{item.name}</p>
                                            {item.code && <p className="font-mono text-[10px] text-slate-400">{item.code}</p>}
                                        </td>
                                        <td className="p-2.5 text-right font-semibold">{item.qty} {item.unitOfMeasure}</td>
                                        <td className="p-2.5 text-right font-mono">{fmt(item.unitPrice)}</td>
                                        <td className="p-2.5 text-right font-bold font-mono">{fmt(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Summary */}
                        <div className="flex justify-end mb-6">
                            <div className="w-64 space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>{fmt(subtotal)}</span></div>
                                {discount > 0 && <div className="flex justify-between text-rose-600"><span>Discount:</span><span>-{fmt(discount)}</span></div>}
                                {tax > 0 && <div className="flex justify-between text-slate-600"><span>Tax (VAT):</span><span>{fmt(tax)}</span></div>}
                                <div className="flex justify-between font-extrabold text-sm border-t-2 border-slate-900 pt-1.5 text-slate-900">
                                    <span>Grand Total:</span><span>{fmt(grandTotal)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-emerald-700 pt-1 border-t border-slate-200">
                                    <span>Advance Paid:</span><span>{fmt(advancePaid)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-rose-700">
                                    <span>Remaining Balance:</span><span>{fmt(balanceDue)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Full Warranty Section */}
                        <WarrantyTermsPrint />

                        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
                            <div>
                                <p className="font-bold text-slate-700">ALUECO ALUMINIUM SYSTEMS — Showroom POS</p>
                                <p>Computer generated invoice — No signature required.</p>
                            </div>
                            <div className="text-center w-36 border-t border-slate-400 pt-1">
                                <p className="font-bold text-slate-800">Cashier Signature</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer buttons */}
            <div className="p-4 bg-slate-50 border-t flex justify-between items-center no-print">
                <Button variant="outline" onClick={onClose}>Close</Button>
                
                <div className="flex gap-2">
                    {onNewSale && (
                        <Button variant="secondary" onClick={onNewSale}>
                            <ShoppingBag size={15} className="mr-1.5" /> Start New Sale
                        </Button>
                    )}
                    <Button variant="primary" onClick={handlePrint}>
                        <Printer size={15} className="mr-1.5" /> Print ({activeTab === 'thermal' ? 'Receipt' : 'A4 Invoice'})
                    </Button>
                </div>
            </div>
        </Modal>
        </>
    );
}
