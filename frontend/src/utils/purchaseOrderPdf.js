import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

/**
 * Generate and download professional PDF for a Standard Purchase Order
 */
export const generatePurchaseOrderPDF = (po, settings = {}) => {
    if (!po) return;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;   // ~210mm
    const pageHeight = doc.internal.pageSize.height; // ~297mm
    const margin = 14;

    const companyName = (settings?.companyName || 'ALUECO ALUMINIUM SYSTEMS').toUpperCase();
    const companyAddress = settings?.companyAddress || '123 Industrial Zone, Colombo, Sri Lanka';
    const companyPhone = settings?.companyPhone || '+94 11 234 5678';
    const companyEmail = settings?.companyEmail || 'info@alueco.lk';
    const companyTax = settings?.taxNumber || settings?.companyTaxNumber || 'VAT-123456789';

    // ── 1. HEADER BANNER (Corporate Indigo) ─────────────────────────
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, 38, 'F');

    // Accent line at bottom of header
    doc.setFillColor(79, 70, 229); // Indigo 600
    doc.rect(0, 38, pageWidth, 2, 'F');

    // Left: Company Info
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, margin, 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225); // Slate 300
    doc.text('Procurement & Supply Chain Management', margin, 20);
    doc.text(companyAddress, margin, 25);
    doc.text(`Tel: ${companyPhone}  |  Email: ${companyEmail}  |  Tax Ref: ${companyTax}`, margin, 30);

    // Right: PO Number & Date
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PURCHASE ORDER', pageWidth - margin, 14, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(165, 180, 252); // Indigo 200
    doc.text(`PO #: ${po.poNumber || 'PO-DRAFT'}`, pageWidth - margin, 22, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Date: ${fmtDate(po.poDate || po.createdAt)}`, pageWidth - margin, 28, { align: 'right' });
    doc.text(`Status: ${(po.status || 'DRAFT').toUpperCase().replace('_', ' ')}`, pageWidth - margin, 33, { align: 'right' });

    // ── 2. SUPPLIER & DELIVERY META BOXES ───────────────────────────
    const boxY = 46;
    const boxWidth = (pageWidth - (margin * 2) - 6) / 2;
    const boxHeight = 36;

    // Supplier Box
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.roundedRect(margin, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('VENDOR / SUPPLIER DETAILS', margin + 4, boxY + 7);

    const sup = po.supplierSnapshot || {};
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text(sup.name || sup.displayName || 'Supplier Not Specified', margin + 4, boxY + 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    let supLineY = boxY + 19;
    if (sup.code) {
        doc.text(`Supplier Code: ${sup.code}`, margin + 4, supLineY);
        supLineY += 4.5;
    }
    if (sup.taxRegistrationNumber) {
        doc.text(`VAT/Tax No: ${sup.taxRegistrationNumber}`, margin + 4, supLineY);
        supLineY += 4.5;
    }
    if (sup.phone) {
        doc.text(`Tel: ${sup.phone}`, margin + 4, supLineY);
    }

    // Delivery Box (Right)
    const delivX = margin + boxWidth + 6;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(delivX, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('SHIP TO / WAREHOUSE DESTINATION', delivX + 4, boxY + 7);

    const deliv = po.deliverTo || {};
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(deliv.warehouseName || 'Main Central Warehouse', delivX + 4, boxY + 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    let delivLineY = boxY + 19;
    if (deliv.address?.line1) {
        const fullAddr = `${deliv.address.line1}${deliv.address.city ? `, ${deliv.address.city}` : ''}`;
        doc.text(fullAddr, delivX + 4, delivLineY);
        delivLineY += 4.5;
    }
    if (po.expectedDeliveryDate) {
        doc.text(`Expected Delivery: ${fmtDate(po.expectedDeliveryDate)}`, delivX + 4, delivLineY);
        delivLineY += 4.5;
    }
    if (po.paymentTerms?.type) {
        doc.text(`Payment Terms: ${po.paymentTerms.type.toUpperCase()}`, delivX + 4, delivLineY);
    }

    // ── 3. ITEMS TABLE ──────────────────────────────────────────────
    const columns = ['#', 'Product Code', 'Description / Item Name', 'Qty', 'Unit Price', 'Tax %', 'Line Total (LKR)'];
    const rows = (po.items || []).map((item, idx) => [
        idx + 1,
        item.productCode || '—',
        item.productName + (item.description ? `\n${item.description}` : ''),
        `${item.orderedQuantity || 0} ${item.unitOfMeasure || 'pcs'}`,
        (item.unitPrice || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 }),
        `${item.taxRate || 0}%`,
        (item.lineTotal || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })
    ]);

    autoTable(doc, {
        startY: boxY + boxHeight + 6,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: {
            fillColor: [30, 41, 59], // Slate 800
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'left'
        },
        styles: {
            fontSize: 8,
            cellPadding: 3,
            valign: 'middle',
            textColor: [30, 41, 59]
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        columnStyles: {
            0: { width: 8, halign: 'center' },
            1: { width: 26, fontStyle: 'bold' },
            2: { width: 62 },
            3: { width: 22, halign: 'right', fontStyle: 'bold' },
            4: { width: 24, halign: 'right' },
            5: { width: 14, halign: 'center' },
            6: { width: 26, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin }
    });

    let finalY = doc.lastAutoTable.finalY + 8;

    // Check if remaining space is too small for totals & signatures, add new page if needed
    if (finalY > pageHeight - 65) {
        doc.addPage();
        finalY = 20;
    }

    // ── 4. TOTALS BREAKDOWN (Right side) ────────────────────────────
    const totalsWidth = 75;
    const totalsX = pageWidth - margin - totalsWidth;
    let currTotalsY = finalY;

    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    // Subtotal
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, currTotalsY);
    doc.text(fmt(po.subtotal).replace('LKR', '').trim(), pageWidth - margin, currTotalsY, { align: 'right' });
    currTotalsY += 5;

    // Discount
    if ((po.totalDiscount || 0) > 0) {
        doc.setTextColor(225, 29, 72); // Rose 600
        doc.text('Discount:', totalsX, currTotalsY);
        doc.text(`-${fmt(po.totalDiscount).replace('LKR', '').trim()}`, pageWidth - margin, currTotalsY, { align: 'right' });
        currTotalsY += 5;
        doc.setTextColor(71, 85, 105);
    }

    // Tax (VAT)
    if ((po.totalTax || 0) > 0) {
        doc.text('Tax (VAT):', totalsX, currTotalsY);
        doc.text(fmt(po.totalTax).replace('LKR', '').trim(), pageWidth - margin, currTotalsY, { align: 'right' });
        currTotalsY += 5;
    }

    // Shipping
    if ((po.shippingCost || 0) > 0) {
        doc.text('Shipping / Delivery:', totalsX, currTotalsY);
        doc.text(fmt(po.shippingCost).replace('LKR', '').trim(), pageWidth - margin, currTotalsY, { align: 'right' });
        currTotalsY += 5;
    }

    // Other charges
    if ((po.otherCharges || 0) > 0) {
        doc.text('Other Charges:', totalsX, currTotalsY);
        doc.text(fmt(po.otherCharges).replace('LKR', '').trim(), pageWidth - margin, currTotalsY, { align: 'right' });
        currTotalsY += 5;
    }

    // Grand Total Divider & Line
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.line(totalsX, currTotalsY, pageWidth - margin, currTotalsY);
    currTotalsY += 5;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Grand Total:', totalsX, currTotalsY);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text(fmt(po.grandTotal), pageWidth - margin, currTotalsY, { align: 'right' });

    // ── 5. SPECIAL NOTES & PROCUREMENT TERMS ─────────────────────────
    const notesWidth = pageWidth - (margin * 2) - totalsWidth - 10;
    let notesY = finalY;

    if (po.notes) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('SPECIAL INSTRUCTIONS / NOTES:', margin, notesY);
        notesY += 4;

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const splitNotes = doc.splitTextToSize(po.notes, notesWidth);
        doc.text(splitNotes, margin, notesY);
        notesY += (splitNotes.length * 4) + 4;
    }

    // Terms
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PROCUREMENT TERMS & CONDITIONS:', margin, notesY);
    notesY += 3.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(148, 163, 184);
    const terms = [
        '1. Goods must strictly match the specifications, descriptions, and quantities stated in this Purchase Order.',
        '2. Delivery note and invoice must explicitly quote this Purchase Order Number.',
        '3. All deliveries are subject to physical inspection & QA approval upon GRN intake.',
        '4. Damaged or non-compliant materials will be rejected and returned at vendor expense.'
    ];
    terms.forEach(t => {
        doc.text(t, margin, notesY);
        notesY += 3.2;
    });

    // ── 6. SIGNATURE AUTHORIZATION FOOTER ─────────────────────────────
    const sigY = Math.max(currTotalsY + 15, notesY + 10, pageHeight - 28);

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, sigY - 4, pageWidth - margin, sigY - 4);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Standard Procurement Document — Computer generated. Valid with authorized procurement signature.', margin, sigY + 2);

    // Signatures lines
    const sigBoxW = 42;
    const sig1X = pageWidth - margin - (sigBoxW * 2) - 8;
    const sig2X = pageWidth - margin - sigBoxW;

    doc.line(sig1X, sigY + 8, sig1X + sigBoxW, sigY + 8);
    doc.text('Prepared By', sig1X + (sigBoxW / 2), sigY + 12, { align: 'center' });

    doc.line(sig2X, sigY + 8, sig2X + sigBoxW, sigY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Authorized Signatory', sig2X + (sigBoxW / 2), sigY + 12, { align: 'center' });

    // Save PDF
    const filename = `ALUECO_Purchase_Order_${po.poNumber || 'PO'}.pdf`;
    doc.save(filename);
};

/**
 * Generate and download professional PDF for AluEco Shortage Requisition PO
 */
export const generateAluPurchaseOrderPDF = (aluPo, settings = {}) => {
    if (!aluPo) return;

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 14;

    const companyName = (settings?.companyName || 'ALUECO ALUMINIUM SYSTEMS').toUpperCase();
    const companyAddress = settings?.companyAddress || '123 Industrial Zone, Colombo, Sri Lanka';
    const companyPhone = settings?.companyPhone || '+94 11 234 5678';
    const companyEmail = settings?.companyEmail || 'info@alueco.lk';

    // ── Header Banner ──
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, 38, 'F');

    doc.setFillColor(16, 185, 129); // Emerald 500 accent for AluEco
    doc.rect(0, 38, pageWidth, 2, 'F');

    // Company Info
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName, margin, 14);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text('Aluminium Systems — Material Shortage Requisition Order', margin, 20);
    doc.text(companyAddress, margin, 25);
    doc.text(`Tel: ${companyPhone}  |  Email: ${companyEmail}`, margin, 30);

    // Right: PO Number & Date
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REQUISITION ORDER', pageWidth - margin, 14, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(110, 231, 183); // Emerald 300
    doc.text(`PO #: ${aluPo.poNumber || 'ALU-PO'}`, pageWidth - margin, 22, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Date: ${fmtDate(aluPo.createdAt)}`, pageWidth - margin, 28, { align: 'right' });
    doc.text(`Status: ${(aluPo.status || 'PENDING').toUpperCase().replace('_', ' ')}`, pageWidth - margin, 33, { align: 'right' });

    // ── Project Meta Box ──
    const boxY = 46;
    const boxHeight = 24;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, boxY, pageWidth - (margin * 2), boxHeight, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('PROJECT & REQUISITION DETAILS', margin + 4, boxY + 6);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Project: ${aluPo.projectName || 'General Aluminium Material Procurement'}`, margin + 4, boxY + 13);
    
    if (aluPo.customerName) {
        doc.text(`Client: ${aluPo.customerName}`, margin + 4, boxY + 19);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Requisition Source: ${(aluPo.sourceType || 'quotation_shortage').replace('_', ' ').toUpperCase()}`, pageWidth - margin - 4, boxY + 13, { align: 'right' });
    doc.text(`Priority: ${(aluPo.priority || 'NORMAL').toUpperCase()}`, pageWidth - margin - 4, boxY + 19, { align: 'right' });

    // ── Items Table ──
    const columns = ['#', 'Item Code', 'Material Name & Type', 'Required Qty', 'Received', 'Pending Qty', 'Est. Cost (LKR)'];
    const rows = (aluPo.items || []).map((item, idx) => [
        idx + 1,
        item.itemCode || '—',
        `${item.productName}\n[${(item.materialType || 'other').toUpperCase()}]`,
        `${item.requiredQuantity || 0} ${item.unitOfMeasure || 'bar'}`,
        `${item.receivedQuantity || 0} ${item.unitOfMeasure || 'bar'}`,
        `${item.pendingQuantity || 0} ${item.unitOfMeasure || 'bar'}`,
        (item.estimatedTotalCost || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })
    ]);

    autoTable(doc, {
        startY: boxY + boxHeight + 6,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'left'
        },
        styles: {
            fontSize: 8,
            cellPadding: 3,
            valign: 'middle',
            textColor: [30, 41, 59]
        },
        columnStyles: {
            0: { width: 8, halign: 'center' },
            1: { width: 28, fontStyle: 'bold' },
            2: { width: 66 },
            3: { width: 22, halign: 'center', fontStyle: 'bold' },
            4: { width: 20, halign: 'center' },
            5: { width: 20, halign: 'center', fontStyle: 'bold' },
            6: { width: 26, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: margin, right: margin }
    });

    let finalY = doc.lastAutoTable.finalY + 8;

    if (finalY > pageHeight - 50) {
        doc.addPage();
        finalY = 20;
    }

    // Total Estimated Cost
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Total Estimated Procurement Cost:', pageWidth - margin - 80, finalY);
    doc.setTextColor(16, 185, 129); // Emerald 600
    doc.text(`Rs. ${(aluPo.totalEstimatedCost || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`, pageWidth - margin, finalY, { align: 'right' });

    // Save PDF
    const filename = `ALUECO_Requisition_${aluPo.poNumber || 'PO'}.pdf`;
    doc.save(filename);
};
