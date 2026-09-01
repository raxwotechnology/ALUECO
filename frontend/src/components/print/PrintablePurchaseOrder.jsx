import React, { forwardRef } from 'react';
import WarrantyTermsPrint from './WarrantyTermsPrint';

const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

/**
 * Printable Purchase Order document formatted for A4 printing and PDF generation.
 */
const PrintablePurchaseOrder = forwardRef(({ po, companyInfo }, ref) => {
    if (!po) return null;

    const company = {
        name: companyInfo?.name || 'ALUECO ALUMINIUM SYSTEMS',
        address: companyInfo?.address || '123 Industrial Zone, Colombo, Sri Lanka',
        taxNumber: companyInfo?.taxNumber || 'VAT-123456789',
        phone: companyInfo?.phone || '+94 11 234 5678',
        email: companyInfo?.email || 'info@alueco.lk',
    };

    const supplier = po.supplierSnapshot || {};
    const deliverTo = po.deliverTo || {};

    return (
        <div ref={ref} className="print-container bg-white text-slate-900 p-10 max-w-[800px] mx-auto font-sans text-xs">
            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b-2 border-indigo-950 mb-6">
                <div>
                    <h1 className="text-2xl font-black text-indigo-950 tracking-wider">{company.name}</h1>
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-0.5">Procurement &amp; Supply Chain Division</p>
                    <p className="text-slate-500 text-[10px] mt-1">{company.address}</p>
                    <p className="text-slate-500 text-[10px]">
                        Tel: {company.phone} | Email: {company.email} | Tax: {company.taxNumber}
                    </p>
                </div>
                <div className="text-right">
                    <h2 className="text-3xl font-extrabold text-indigo-900">PURCHASE ORDER</h2>
                    <p className="font-mono text-sm font-bold text-slate-800 mt-1">PO #{po.poNumber}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">Date: {formatDate(po.createdAt)}</p>
                </div>
            </div>

            {/* Supplier & Delivery */}
            <div className="grid grid-cols-2 gap-6 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Vendor / Supplier</p>
                    <p className="font-bold text-sm text-slate-900">{supplier.name || supplier.displayName}</p>
                    {supplier.code && <p className="text-slate-600 font-mono text-[11px]">{supplier.code}</p>}
                    {supplier.taxRegistrationNumber && <p className="text-slate-600">VAT: {supplier.taxRegistrationNumber}</p>}
                    {supplier.phone && <p className="text-slate-600">Tel: {supplier.phone}</p>}
                </div>

                <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Ship To / Warehouse</p>
                    <p className="font-bold text-slate-900">{deliverTo.warehouseName || 'Main Warehouse'}</p>
                    {deliverTo.address?.line1 && <p className="text-slate-600">{deliverTo.address.line1}</p>}
                    {deliverTo.address?.city && <p className="text-slate-600">{deliverTo.address.city}</p>}
                    {po.expectedDeliveryDate && (
                        <p className="text-slate-600 mt-1">
                            Expected Delivery: <strong className="text-slate-900">{formatDate(po.expectedDeliveryDate)}</strong>
                        </p>
                    )}
                </div>
            </div>

            {/* Line items table */}
            <table className="w-full mb-6 border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-600">
                    <tr>
                        <th className="p-2.5 text-left w-8">#</th>
                        <th className="p-2.5 text-left">Item Description</th>
                        <th className="p-2.5 text-right w-20">Ordered Qty</th>
                        <th className="p-2.5 text-right w-24">Unit Price</th>
                        <th className="p-2.5 text-right w-20">Tax %</th>
                        <th className="p-2.5 text-right w-28">Line Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {(po.items || []).map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2.5">
                                <p className="font-bold text-slate-900">{item.productName}</p>
                                {item.productCode && <p className="font-mono text-[10px] text-slate-400">{item.productCode}</p>}
                            </td>
                            <td className="p-2.5 text-right font-bold text-slate-900">
                                {item.orderedQuantity} {item.unitOfMeasure || ''}
                            </td>
                            <td className="p-2.5 text-right font-mono">{fmt(item.unitPrice)}</td>
                            <td className="p-2.5 text-right font-mono">{item.taxRate || 0}%</td>
                            <td className="p-2.5 text-right font-bold font-mono text-indigo-950">{fmt(item.lineTotal)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-6">
                <div className="w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600"><span>Subtotal:</span><span>{fmt(po.subtotal)}</span></div>
                    {po.totalDiscount > 0 && <div className="flex justify-between text-rose-600"><span>Discount:</span><span>-{fmt(po.totalDiscount)}</span></div>}
                    {po.totalTax > 0 && <div className="flex justify-between text-slate-600"><span>Tax (VAT):</span><span>{fmt(po.totalTax)}</span></div>}
                    <div className="flex justify-between font-extrabold text-sm border-t-2 border-indigo-950 pt-2 text-indigo-950">
                        <span>Total PO Amount:</span><span>{fmt(po.grandTotal)}</span>
                    </div>
                </div>
            </div>

            {/* Notes */}
            {po.notes && (
                <div className="mb-6 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Special Instructions &amp; Notes</p>
                    <p className="text-slate-700 whitespace-pre-wrap">{po.notes}</p>
                </div>
            )}

            {/* Terms and Conditions */}
            <WarrantyTermsPrint compact={false} />

            {/* Signatures */}
            <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
                <div>
                    <p className="font-bold text-slate-700">Issued by ALUECO ALUMINIUM SYSTEMS</p>
                    <p>Standard Procurement Order — Valid without physical stamp if electronically approved.</p>
                </div>
                <div className="flex gap-8">
                    <div className="text-center w-32 border-t border-slate-400 pt-1">
                        <p className="font-bold text-slate-800">Prepared By</p>
                    </div>
                    <div className="text-center w-32 border-t border-slate-400 pt-1">
                        <p className="font-bold text-slate-800">Authorized Manager</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

PrintablePurchaseOrder.displayName = 'PrintablePurchaseOrder';
export default PrintablePurchaseOrder;
