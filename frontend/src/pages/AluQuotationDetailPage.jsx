import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet, Download, Printer, Info, Layers, Eye, Settings as SettingsIcon, Users, Truck, DollarSign, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Button from '../components/ui/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../features/settings/useSettings';

const AluQuotationDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;
    
    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedProfileCode, setSelectedProfileCode] = useState(null);
    const [selectedGlassType, setSelectedGlassType] = useState(null);

    useEffect(() => {
        const fetchQuotation = async () => {
            try {
                const { data } = await api.get(`/alu/quotations/${id}`);
                setQuotation(data.data);
                
                // Set default selected profile for visual optimization layout
                const optKeys = Object.keys(data.data.cuttingOptimizationResults || {});
                if (optKeys.length > 0) {
                    setSelectedProfileCode(optKeys[0]);
                }
                
                // Set default selected glass for 2D optimization layout
                const glassKeys = Object.keys(data.data.glassOptimizationResults || {});
                if (glassKeys.length > 0) {
                    setSelectedGlassType(glassKeys[0]);
                }
            } catch (error) {
                toast.error('Failed to load quotation details');
            } finally {
                setLoading(false);
            }
        };
        fetchQuotation();
    }, [id]);

    const handleDownloadCustomerPDF = () => {
        if (!quotation) return;
        
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.width;
        
        // Header styling
        doc.setFillColor(15, 118, 110); // Teal 700
        doc.rect(0, 0, pageWidth, 40, 'F');

        let textLeftX = 14;
        // Primary System Logo (Left)
        if (settings?.companyLogo) {
            try {
                doc.addImage(settings.companyLogo, 'PNG', 14, 6, 26, 26);
                textLeftX = 44;
            } catch (e) {
                try {
                    doc.addImage(settings.companyLogo, 'JPEG', 14, 6, 26, 26);
                    textLeftX = 44;
                } catch (err) {}
            }
        }

        let textRightX = pageWidth - 14;
        // Secondary Logo (Right)
        if (settings?.secondaryLogo) {
            try {
                doc.addImage(settings.secondaryLogo, 'PNG', pageWidth - 38, 6, 24, 24);
                textRightX = pageWidth - 42;
            } catch (e) {
                try {
                    doc.addImage(settings.secondaryLogo, 'JPEG', pageWidth - 38, 6, 24, 24);
                    textRightX = pageWidth - 42;
                } catch (err) {}
            }
        }

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text((settings?.companyName || 'ALUECO ALUMINIUM SYSTEMS').toUpperCase(), textLeftX, 17);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(settings?.companyAddress || 'No. 123, Negoda Road, Weliweriya, Sri Lanka', textLeftX, 23);
        
        const contactLine = [
            settings?.companyPhone ? `Tel: ${settings.companyPhone}` : '',
            settings?.companyEmail ? `Email: ${settings.companyEmail}` : ''
        ].filter(Boolean).join(' | ') || 'Tel: 0777 140 680 | Email: info@alueco.lk';
        doc.text(contactLine, textLeftX, 28);

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('QUOTATION', textRightX, 17, { align: 'right' });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Quote No: ${quotation.quoteNumber}-Rev${String(quotation.version).padStart(2, '0')}`, textRightX, 23, { align: 'right' });
        doc.text(`Date: ${format(new Date(quotation.date), 'dd MMM yyyy')}`, textRightX, 28, { align: 'right' });
        doc.text(`Valid Till: ${format(new Date(quotation.validTill), 'dd MMM yyyy')}`, textRightX, 33, { align: 'right' });

        // Metadata grid
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('CUSTOMER DETAILS', 14, 52);
        doc.setFont('helvetica', 'normal');
        doc.text([
            `Name: ${quotation.customerName}`,
            `Location: ${quotation.location || 'N/A'}`,
            `Date: ${format(new Date(quotation.date), 'yyyy-MM-dd')}`
        ], 14, 58);

        doc.setFont('helvetica', 'bold');
        doc.text('PROJECT DETAILS', pageWidth / 2, 52);
        doc.setFont('helvetica', 'normal');
        doc.text([
            `Project: ${quotation.projectName}`,
            `Payment Terms: 60% Advance, 40% Completion`,
            `Prepared By: ${quotation.preparedBy}`
        ], pageWidth / 2, 58);

        // Main items table
        const columns = ['No.', 'Application', 'Description', 'Width (mm)', 'Height (mm)', 'Qty', 'Unit Rate (LKR)', 'Total (LKR)'];
        const rows = quotation.items.map((item, idx) => [
            idx + 1,
            item.applicationType,
            item.configuration,
            item.width,
            item.height,
            item.quantity,
            item.unitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 }),
            item.totalPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })
        ]);

        autoTable(doc, {
            startY: 78,
            head: [columns],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold' },
            columnStyles: {
                0: { width: 10 },
                3: { halign: 'right' },
                4: { halign: 'right' },
                5: { halign: 'right' },
                6: { halign: 'right' },
                7: { halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14 }
        });

        const finalY = doc.lastAutoTable.finalY + 8;
        const summaryX = pageWidth - 90;
        
        // Sums
        const subtotal = quotation.items.reduce((s, item) => s + item.totalPrice, 0);
        const transport = quotation.transportCost;
        const additional = quotation.additionalCosts.reduce((s, a) => s + a.cost, 0);
        const discount = quotation.discount;
        const subTotalExcludingTax = subtotal + transport + additional - discount;
        const vat = subTotalExcludingTax * 0.18; // default 18% VAT
        const finalValue = subTotalExcludingTax + vat;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Sub Total:', summaryX, finalY);
        doc.text(`LKR ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY, { align: 'right' });

        doc.text('Transport:', summaryX, finalY + 5);
        doc.text(`LKR ${transport.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY + 5, { align: 'right' });

        if (additional > 0) {
            doc.text('Other Charges:', summaryX, finalY + 10);
            doc.text(`LKR ${additional.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY + 10, { align: 'right' });
        }
        
        const discountOffset = additional > 0 ? 15 : 10;
        if (discount > 0) {
            doc.text('Discount:', summaryX, finalY + discountOffset);
            doc.text(`-LKR ${discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY + discountOffset, { align: 'right' });
        }
        
        const vatOffset = discountOffset + (discount > 0 ? 5 : 0);
        doc.text('VAT (18%):', summaryX, finalY + vatOffset + 5);
        doc.text(`LKR ${vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY + vatOffset + 5, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.text('FINAL QUOTATION VALUE:', summaryX, finalY + vatOffset + 12);
        doc.text(`LKR ${finalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, pageWidth - 14, finalY + vatOffset + 12, { align: 'right' });

        // Left checklist/terms
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('THIS QUOTATION INCLUDES', 14, finalY);
        doc.setFont('helvetica', 'normal');
        const checklistTexts = quotation.checklist.map(c => `[x] ${c}`);
        doc.text(checklistTexts, 14, finalY + 5, { maxWidth: 100 });

        doc.setFont('helvetica', 'bold');
        doc.text('TERMS & CONDITIONS', 14, finalY + 32);
        doc.setFont('helvetica', 'normal');
        const termsTexts = quotation.terms.map((t, i) => `${i + 1}. ${t}`);
        doc.text(termsTexts, 14, finalY + 37, { maxWidth: 100 });

        // Signatures
        const bottomY = doc.internal.pageSize.height - 25;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, bottomY, 64, bottomY);
        doc.line(pageWidth - 64, bottomY, pageWidth - 14, bottomY);
        doc.text('Authorised Signature', 39, bottomY + 4, { align: 'center' });
        doc.text('Customer Acceptance Signature', pageWidth - 39, bottomY + 4, { align: 'center' });

        doc.save(`ALUECO_Quotation_${quotation.quoteNumber}_Rev${quotation.version}.pdf`);
    };

    const handleDownloadInternalPDF = () => {
        if (!quotation) return;
        
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.width;
        
        // Header
        doc.setFillColor(15, 23, 42); // slate 900
        doc.rect(0, 0, pageWidth, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`INTERNAL COSTING SHEET - ${quotation.quoteNumber}`, 14, 12);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Project: ${quotation.projectName} | Client: ${quotation.customerName} | Rev: ${quotation.version}`, 14, 20);

        // Sections
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('1. Aluminium profiles purchased requirement (Cutting optimized)', 14, 38);

        const columnsAlu = ['Profile Code', 'Description', 'Supplier Length', 'Bars Purchased', 'Total Purchased', 'Total Used', 'Wastage %', 'Total Cost'];
        const rowsAlu = Object.values(quotation.cuttingOptimizationResults || {}).map(p => [
            p.profileCode,
            p.description,
            p.bars[0] ? `${parseFloat((p.bars[0].length / 304.8).toFixed(1))}ft` : 'N/A',
            p.totalBarsPurchased,
            `${p.purchasedLengthMm}mm`,
            `${p.usedLengthMm}mm`,
            `${p.wastePercent}%`,
            p.totalCost.toLocaleString()
        ]);

        autoTable(doc, {
            startY: 42,
            head: [columnsAlu],
            body: rowsAlu,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] },
            margin: { left: 14, right: 14 }
        });

        let nextY = doc.lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.text('2. Glass requirements breakdown', 14, nextY);

        const columnsGlass = ['Glass Type', 'Width', 'Height', 'Quantity', 'Total Area (Sqft)', 'Unit Rate', 'Cost'];
        const rowsGlass = [];
        quotation.items.forEach(item => {
            item.glassItems.forEach(g => {
                rowsGlass.push([
                    g.glassType,
                    `${g.width}mm`,
                    `${g.height}mm`,
                    g.qty,
                    g.areaSqFt,
                    g.unitRate.toLocaleString(),
                    g.cost.toLocaleString()
                ]);
            });
        });

        autoTable(doc, {
            startY: nextY + 4,
            head: [columnsGlass],
            body: rowsGlass,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] },
            margin: { left: 14, right: 14 }
        });

        nextY = doc.lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.text('3. Accessories requirement breakdown', 14, nextY);

        // Group accessories across project
        const groupedAcc = {};
        quotation.items.forEach(item => {
            item.accessories.forEach(a => {
                if (!groupedAcc[a.code]) {
                    groupedAcc[a.code] = { name: a.name, qty: 0, cost: 0, rate: a.unitRate };
                }
                groupedAcc[a.code].qty += a.qty;
                groupedAcc[a.code].cost += a.cost;
            });
        });

        const columnsAcc = ['Item Code', 'Description', 'Quantity', 'Selling Rate', 'Total Cost'];
        const rowsAcc = Object.entries(groupedAcc).map(([code, a]) => [
            code,
            a.name,
            a.qty,
            a.rate.toLocaleString(),
            a.cost.toLocaleString()
        ]);

        autoTable(doc, {
            startY: nextY + 4,
            head: [columnsAcc],
            body: rowsAcc,
            theme: 'grid',
            headStyles: { fillColor: [51, 65, 85] },
            margin: { left: 14, right: 14 }
        });

        nextY = doc.lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'bold');
        doc.text('4. Cost Summary (Internal Audit)', 14, nextY);

        const columnsSum = ['Cost Component', 'Amount (LKR)'];
        const rowsSum = [
            ['Total Aluminium Cost', quotation.totalAluminiumCost.toLocaleString()],
            ['Total Glass Cost', quotation.totalGlassCost.toLocaleString()],
            ['Total Accessories Cost', quotation.totalAccessoriesCost.toLocaleString()],
            ['Total Labour Cost', quotation.totalLabourCost.toLocaleString()],
            ['Transport Cost', quotation.transportCost.toLocaleString()],
            ['Other Charges', quotation.additionalCosts.reduce((s, a) => s + a.cost, 0).toLocaleString()],
            ['Profit Margin (GP)', `${quotation.profitMarginPercent}%`],
            ['Quoted Selling Price', quotation.finalSellingPrice.toLocaleString()]
        ];

        autoTable(doc, {
            startY: nextY + 4,
            head: [columnsSum],
            body: rowsSum,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            margin: { left: 14, right: 14 }
        });

        doc.save(`ALUECO_Internal_Costing_${quotation.quoteNumber}_Rev${quotation.version}.pdf`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-40">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (!quotation) {
        return <div className="text-center py-20 text-slate-500 font-semibold">Quotation not found.</div>;
    }

    const additionalCostSum = quotation.additionalCosts.reduce((s, a) => s + a.cost, 0);
    const subtotalCost = quotation.totalAluminiumCost + quotation.totalGlassCost + quotation.totalAccessoriesCost + quotation.totalLabourCost + quotation.transportCost + additionalCostSum;

    const selectedProfileOpt = quotation.cuttingOptimizationResults[selectedProfileCode];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Top Toolbar Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm">
                <h1 className="text-xl font-bold text-slate-800">Material List (Internal)</h1>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate('/alu/quotations')} className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 px-3.5 rounded-lg text-xs transition">
                        <ArrowLeft size={14} /> Back to Quotation
                    </Button>
                    <Button onClick={handleDownloadInternalPDF} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs shadow-sm transition">
                        <FileSpreadsheet size={14} /> Export Excel
                    </Button>
                    <Button onClick={handleDownloadCustomerPDF} className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs shadow-sm transition">
                        <Download size={14} /> Export PDF
                    </Button>
                    <Button onClick={() => window.print()} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold py-1.5 px-3.5 rounded-lg text-xs shadow-sm transition">
                        <Printer size={14} /> Print
                    </Button>
                </div>
            </div>

            {/* Quotation Metadata Panel */}
            <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-stretch gap-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 flex-1">
                    <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quote No.</span>
                        <span className="text-sm font-extrabold text-slate-800">{quotation.quoteNumber}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Name</span>
                        <span className="text-sm font-extrabold text-slate-800">{quotation.projectName}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer</span>
                        <span className="text-sm font-extrabold text-slate-800">{quotation.customerName}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</span>
                        <span className="text-sm font-extrabold text-slate-800">{format(new Date(quotation.date), 'yyyy-MM-dd')}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valid Till</span>
                        <span className="text-sm font-extrabold text-slate-800">{format(new Date(quotation.validTill), 'yyyy-MM-dd')}</span>
                    </div>
                </div>
                
                {/* Final value card */}
                <div className="bg-teal-950 text-white p-4 rounded-xl flex flex-col justify-center min-w-[200px]">
                    <span className="text-[9px] font-bold text-teal-300 uppercase tracking-widest text-right">Final Quotation Value</span>
                    <span className="text-xl font-black text-right mt-1">LKR {quotation.finalSellingPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>

            {/* Cost cards grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                    { label: 'Total Aluminium Cost', val: `${quotation.totalAluminiumCost.toLocaleString()}`, color: 'text-slate-800', icon: Layers, iconColor: 'bg-indigo-50 text-indigo-600' },
                    { label: 'Total Glass Cost', val: `${quotation.totalGlassCost.toLocaleString()}`, color: 'text-slate-800', icon: Eye, iconColor: 'bg-cyan-50 text-cyan-600' },
                    { label: 'Total Accessories Cost', val: `${quotation.totalAccessoriesCost.toLocaleString()}`, color: 'text-slate-800', icon: Settings, iconColor: 'bg-amber-50 text-amber-600' },
                    { label: 'Total Labour Cost', val: `${quotation.totalLabourCost.toLocaleString()}`, color: 'text-slate-800', icon: Users, iconColor: 'bg-orange-50 text-orange-600' },
                    { label: 'Transport Cost', val: `${quotation.transportCost.toLocaleString()}`, color: 'text-slate-800', icon: Truck, iconColor: 'bg-teal-50 text-teal-600' },
                    { label: 'Total Cost (Before Margin)', val: `${subtotalCost.toLocaleString()}`, color: 'text-slate-800', icon: DollarSign, iconColor: 'bg-slate-100 text-slate-700' }
                ].map((c, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${c.iconColor}`}>
                            <c.icon size={20} />
                        </div>
                        <div>
                            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">{c.label}</span>
                            <span className={`text-base font-black ${c.color}`}>{c.val}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Split layout: Aluminium table + optimization visual */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div className="border-b pb-2 flex gap-6">
                    <span className="text-emerald-700 font-extrabold border-b-2 border-emerald-600 pb-2 text-sm flex items-center gap-1.5">
                        <span className="w-4 h-4 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                        Aluminium Material List
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left side table */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="overflow-x-auto border border-slate-100 rounded-xl">
                            <table className="min-w-full divide-y divide-slate-100 text-xs">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-3 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">No.</th>
                                        <th className="px-3 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Profile Code</th>
                                        <th className="px-3 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Profile Description</th>
                                        <th className="px-3 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Supplier Length</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-500 uppercase tracking-wider">Required Cutting (mm)</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-500 uppercase tracking-wider">Optimized Purchase</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-500 uppercase tracking-wider">Waste (%)</th>
                                        <th className="px-3 py-3 text-right font-bold text-slate-500 uppercase tracking-wider">Total Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.values(quotation.cuttingOptimizationResults || {}).map((p, idx) => (
                                        <tr
                                            key={p.profileCode}
                                            onClick={() => setSelectedProfileCode(p.profileCode)}
                                            className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                                                selectedProfileCode === p.profileCode ? 'bg-indigo-50/20 font-semibold' : ''
                                            }`}
                                        >
                                            <td className="px-3 py-3 text-slate-400">{idx + 1}</td>
                                            <td className="px-3 py-3 font-bold text-indigo-600">{p.profileCode}</td>
                                            <td className="px-3 py-3 text-slate-600">{p.description}</td>
                                            <td className="px-3 py-3 text-slate-500">
                                                {p.bars[0] ? `${parseFloat((p.bars[0].length / 304.8).toFixed(1))} ft (${p.bars[0].length} mm)` : 'N/A'}
                                            </td>
                                            <td className="px-3 py-3 text-right text-slate-700">
                                                <div className="font-semibold">{p.usedLengthMm.toLocaleString()} mm</div>
                                                <div className="text-[10px] text-slate-400">{p.requiredCuts.length} Pcs</div>
                                            </td>
                                            <td className="px-3 py-3 text-right text-slate-700">
                                                <div className="font-semibold">{p.purchasedLengthMm.toLocaleString()} mm</div>
                                                <div className="text-[10px] text-slate-400">{p.totalBarsPurchased} Bars</div>
                                            </td>
                                            <td className="px-3 py-3 text-right text-rose-600 font-bold">{p.wastePercent}%</td>
                                            <td className="px-3 py-3 text-right font-bold text-slate-800">LKR {p.totalCost.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals aggregate block */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            {[
                                { label: 'Total Purchased Length', val: `${Object.values(quotation.cuttingOptimizationResults).reduce((s, p) => s + p.purchasedLengthMm, 0).toLocaleString()} mm` },
                                { label: 'Total Used Length', val: `${Object.values(quotation.cuttingOptimizationResults).reduce((s, p) => s + p.usedLengthMm, 0).toLocaleString()} mm` },
                                { label: 'Total Waste Length', val: `${Object.values(quotation.cuttingOptimizationResults).reduce((s, p) => s + p.wasteLengthMm, 0).toLocaleString()} mm` },
                                { label: 'Overall Waste %', val: `${(Object.values(quotation.cuttingOptimizationResults).reduce((s, p) => s + p.wasteLengthMm, 0) / Object.values(quotation.cuttingOptimizationResults).reduce((s, p) => s + p.purchasedLengthMm, 0) * 100).toFixed(1)}%` },
                                { label: 'Total Aluminium Cost', val: `LKR ${quotation.totalAluminiumCost.toLocaleString()}`, highlight: true }
                            ].map((agg, idx) => (
                                <div key={idx}>
                                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">{agg.label}</span>
                                    <span className={`text-xs font-black mt-1 ${agg.highlight ? 'text-emerald-600' : 'text-slate-700'}`}>{agg.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right side diagrams */}
                    <div className="lg:col-span-4 border-l border-slate-100 pl-6 space-y-4">
                        <h3 className="text-sm font-bold text-slate-800">
                            Cutting Optimization - {selectedProfileCode || 'Select profile'}
                        </h3>
                        
                        {selectedProfileOpt ? (
                            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                                {selectedProfileOpt.bars.map((bar, barIdx) => (
                                    <div key={barIdx} className="bg-slate-50/50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                                            <span>Bar {String(barIdx + 1).padStart(2, '0')} - {parseFloat((bar.length / 304.8).toFixed(1))} ft ({bar.length} mm)</span>
                                            <span className="text-slate-600 font-black">Used: {bar.used} mm | Waste: {bar.waste} mm</span>
                                        </div>
                                        
                                        {/* Bar segments */}
                                        <div className="w-full h-7 bg-slate-200 rounded-lg overflow-hidden flex border border-slate-200 shadow-inner">
                                            {bar.cuts.map((cut, cutIdx) => {
                                                const widthPct = (cut / bar.length) * 100;
                                                return (
                                                    <div
                                                        key={cutIdx}
                                                        style={{ width: `${widthPct}%` }}
                                                        className="bg-emerald-500 border-r border-emerald-600 text-white font-bold text-[9px] flex items-center justify-center"
                                                        title={`Cut length: ${cut}mm`}
                                                    >
                                                        {cut}
                                                    </div>
                                                );
                                            })}
                                            {bar.waste > 0 && (
                                                <div
                                                    style={{ width: `${(bar.waste / bar.length) * 100}%` }}
                                                    className="bg-slate-300 font-bold text-slate-500 text-[9px] flex items-center justify-center"
                                                    title={`Waste remaining: ${bar.waste}mm`}
                                                >
                                                    {bar.waste > 100 ? `${bar.waste}` : 'W'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-xs">Select a profile row to view layouts.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom 3-column dashboard section (Glass List, Accessories, Internal Cost Summary) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Column 1: Glass List */}
                <div className="lg:col-span-4 bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                        <h3 className="text-sm font-extrabold text-slate-800 border-b pb-1.5 flex items-center gap-1.5">
                            <span className="w-4.5 h-4.5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                            Glass List
                        </h3>
                        <div className="overflow-x-auto text-[10px]">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead>
                                    <tr className="text-slate-400 font-bold">
                                        <th className="pb-2 text-left">No.</th>
                                        <th className="pb-2 text-left">Glass Type</th>
                                        <th className="pb-2 text-left">Thickness</th>
                                        <th className="pb-2 text-right">Qty</th>
                                        <th className="pb-2 text-right">Rate</th>
                                        <th className="pb-2 text-right">Total (LKR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-600">
                                    {quotation.items.flatMap((item, itemIdx) => 
                                        item.glassItems.map((g, gIdx) => (
                                            <tr key={`${itemIdx}-${gIdx}`}>
                                                <td className="py-2">{gIdx + 1}</td>
                                                <td className="py-2 font-medium text-slate-800">{g.glassType}</td>
                                                <td className="py-2">{g.thickness}mm</td>
                                                <td className="py-2 text-right">{g.qty}</td>
                                                <td className="py-2 text-right">{g.unitRate.toLocaleString()}</td>
                                                <td className="py-2 text-right font-bold text-slate-800">{g.cost.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border text-xs mt-3">
                        <span className="font-semibold text-slate-500">Total Area: <strong className="text-slate-800">{
                            quotation.items.reduce((sum, item) => sum + item.glassItems.reduce((s, g) => s + g.areaSqFt, 0), 0).toFixed(1)
                        } Sq.ft</strong></span>
                        <span className="font-black text-emerald-600">LKR {quotation.totalGlassCost.toLocaleString()}</span>
                    </div>
                </div>

                {/* Column 2: Accessories List */}
                <div className="lg:col-span-4 bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-3">
                        <h3 className="text-sm font-extrabold text-slate-800 border-b pb-1.5 flex items-center gap-1.5">
                            <span className="w-4.5 h-4.5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black">3</span>
                            Accessories List
                        </h3>
                        <div className="overflow-x-auto text-[10px]">
                            <table className="min-w-full divide-y divide-slate-100">
                                <thead>
                                    <tr className="text-slate-400 font-bold">
                                        <th className="pb-2 text-left">Item</th>
                                        <th className="pb-2 text-left">Unit</th>
                                        <th className="pb-2 text-right">Quantity</th>
                                        <th className="pb-2 text-right">Rate</th>
                                        <th className="pb-2 text-right">Total (LKR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-600">
                                    {Object.entries(
                                        quotation.items.reduce((acc, item) => {
                                            item.accessories.forEach(a => {
                                                if (!acc[a.code]) acc[a.code] = { name: a.name, qty: 0, cost: 0, rate: a.unitRate };
                                                acc[a.code].qty += a.qty;
                                                acc[a.code].cost += a.cost;
                                            });
                                            return acc;
                                        }, {})
                                    ).map(([code, a]) => (
                                        <tr key={code}>
                                            <td className="py-2 font-medium text-slate-800">{a.name}</td>
                                            <td className="py-2">Nos</td>
                                            <td className="py-2 text-right">{a.qty}</td>
                                            <td className="py-2 text-right">{a.rate.toLocaleString()}</td>
                                            <td className="py-2 text-right font-bold text-slate-800">{a.cost.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border text-xs mt-3">
                        <span className="font-semibold text-slate-500">Total Accessories Cost</span>
                        <span className="font-black text-indigo-600">LKR {quotation.totalAccessoriesCost.toLocaleString()}</span>
                    </div>
                </div>

                {/* Column 3: Internal Cost Summary */}
                <div className="lg:col-span-4 bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
                    <h3 className="text-sm font-extrabold text-slate-800 border-b pb-1.5 flex items-center gap-1.5">
                        <span className="w-4.5 h-4.5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black">4</span>
                        Cost Summary (Internal)
                    </h3>
                    
                    <div className="space-y-2.5 text-xs">
                        {[
                            { label: 'Aluminium Cost', val: quotation.totalAluminiumCost },
                            { label: 'Glass Cost', val: quotation.totalGlassCost },
                            { label: 'Accessories Cost', val: quotation.totalAccessoriesCost },
                            { label: 'Labour Cost', val: quotation.totalLabourCost },
                            { label: 'Transport Cost', val: quotation.transportCost },
                            { label: 'Other Charges', val: additionalCostSum }
                        ].map((row, idx) => (
                            <div key={idx} className="flex justify-between items-center text-slate-600 py-0.5">
                                <span>{row.label}</span>
                                <span className="font-semibold text-slate-800">{row.val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                        
                        <div className="flex justify-between items-center font-bold border-t pt-2.5 text-slate-800 mt-2">
                            <span>Total Cost (Before Margin)</span>
                            <span>{subtotalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500">
                            <span>Profit Margin</span>
                            <span>{quotation.profitMarginPercent.toFixed(2)} %</span>
                        </div>
                        
                        <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-2">
                            <span className="font-bold text-emerald-700">Selling Price (Quotation Value)</span>
                            <span className="text-base font-black text-emerald-600">LKR {quotation.finalSellingPrice.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2D Glass Sheet Cutting Layout */}
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-4">
                <div className="border-b pb-2 flex justify-between items-center">
                    <span className="text-emerald-700 font-extrabold pb-2 text-sm flex items-center gap-1.5">
                        <span className="w-4 h-4 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-[10px] font-black">5</span>
                        2D Glass Sheet Cutting Layout
                    </span>
                    
                    {/* Glass type selectors */}
                    {quotation.glassOptimizationResults && Object.keys(quotation.glassOptimizationResults).length > 0 && (
                        <div className="flex bg-slate-100 p-1 rounded-lg text-[10px] font-bold">
                            {Object.keys(quotation.glassOptimizationResults).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedGlassType(type)}
                                    className={`py-1 px-2.5 rounded transition ${selectedGlassType === type ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {selectedGlassType && quotation.glassOptimizationResults[selectedGlassType] ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-3 rounded-lg text-xs">
                            <div>
                                <span className="block text-slate-400 text-[10px] font-bold uppercase">Standard Sheet Size</span>
                                <span className="font-extrabold text-slate-800">8ft x 4ft (2438 x 1219 mm)</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 text-[10px] font-bold uppercase">Total Sheets Purchased</span>
                                <span className="font-extrabold text-slate-800">
                                    {quotation.glassOptimizationResults[selectedGlassType].sheetsPurchased} Sheets
                                </span>
                            </div>
                            <div>
                                <span className="block text-slate-400 text-[10px] font-bold uppercase">Total Cut Panels</span>
                                <span className="font-extrabold text-slate-800">
                                    {quotation.glassOptimizationResults[selectedGlassType].requiredPanels.length} Panels
                                </span>
                            </div>
                            <div>
                                <span className="block text-slate-400 text-[10px] font-bold uppercase">Optimized Glass Cost</span>
                                <span className="font-extrabold text-emerald-600">
                                    LKR {quotation.glassOptimizationResults[selectedGlassType].totalCost.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Rendering Sheets */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {quotation.glassOptimizationResults[selectedGlassType].sheets.map((sheet, sIdx) => (
                                <div key={sIdx} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 shadow-sm">
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                                        <span>Sheet {sIdx + 1} ({sheet.width} x {sheet.height} mm)</span>
                                        <span className="text-slate-600">Waste: {sheet.wastePercent}%</span>
                                    </div>
                                    
                                    {/* 2D visual layout representation (Aspect Ratio 2:1 since 2438 x 1219 is 2:1) */}
                                    <div className="relative w-full aspect-[2/1] bg-sky-50 border border-sky-200 rounded-lg overflow-hidden shadow-inner">
                                        {sheet.panels.map((p, pIdx) => {
                                            const left = (p.x / sheet.width) * 100;
                                            const top = (p.y / sheet.height) * 100;
                                            const width = (p.width / sheet.width) * 100;
                                            const height = (p.height / sheet.height) * 100;

                                            return (
                                                <div
                                                    key={pIdx}
                                                    style={{
                                                        left: `${left}%`,
                                                        top: `${top}%`,
                                                        width: `${width}%`,
                                                        height: `${height}%`,
                                                        position: 'absolute'
                                                    }}
                                                    className="bg-indigo-100 border border-indigo-400 text-indigo-700 text-[8px] flex items-center justify-center font-bold font-mono overflow-hidden uppercase hover:bg-indigo-200 transition"
                                                    title={`Glass Pane: ${p.width} x ${p.height} mm`}
                                                >
                                                    <span className="truncate p-1">{p.width}x{p.height}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <p className="text-slate-400 text-xs italic">No optimized 2D glass layouts computed for this quotation.</p>
                )}
            </div>

            {/* Bottom Alert Warning Note */}
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl flex items-start gap-2.5 text-xs shadow-sm">
                <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="font-medium">
                    Note: This is an internal material list. Prices and costs are not visible in the customer quotation PDF.
                </p>
            </div>
        </div>
    );
};

export default AluQuotationDetailPage;
