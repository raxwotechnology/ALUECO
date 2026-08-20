import React from 'react';
import { format } from 'date-fns';
import { Phone, Mail, Globe, MapPin, CheckCircle2, ShieldCheck } from 'lucide-react';

/**
 * Diagram Sketch Icon Renderer for Aluminium Application Types
 */
function ApplicationSketchDiagram({ type = '', configuration = '' }) {
    const typeLower = (type || '').toLowerCase();
    const isCasement = typeLower.includes('casement');
    const isFixed = typeLower.includes('fixed');

    return (
        <div className="w-20 h-14 bg-white border-2 border-slate-300 rounded-lg p-1 flex items-center justify-center relative overflow-hidden shadow-sm">
            <svg viewBox="0 0 100 70" className="w-full h-full stroke-slate-800 fill-none stroke-[2]">
                <rect x="4" y="4" width="92" height="62" className="stroke-slate-900 fill-slate-100 stroke-[3]" rx="1.5" />
                
                {isFixed ? (
                    <g>
                        <rect x="9" y="9" width="82" height="52" className="stroke-slate-500 fill-sky-50/70 stroke-[1.5]" />
                        <line x1="18" y1="52" x2="82" y2="18" className="stroke-sky-400 stroke-[1.5] stroke-dasharray-[4,3]" />
                    </g>
                ) : isCasement ? (
                    <g>
                        <line x1="50" y1="4" x2="50" y2="66" className="stroke-slate-900 stroke-[3]" />
                        <rect x="9" y="9" width="37" height="52" className="fill-sky-50/70 stroke-slate-700 stroke-[1.5]" />
                        <rect x="54" y="9" width="37" height="52" className="fill-sky-50/70 stroke-slate-700 stroke-[1.5]" />
                        <path d="M 11 11 L 44 35 L 11 59" className="stroke-sky-600 stroke-[1.5] stroke-dasharray-[3,2]" />
                        <path d="M 89 11 L 56 35 L 89 59" className="stroke-sky-600 stroke-[1.5] stroke-dasharray-[3,2]" />
                    </g>
                ) : (
                    <g>
                        <line x1="34" y1="4" x2="34" y2="66" className="stroke-slate-900 stroke-[2.5]" />
                        <line x1="66" y1="4" x2="66" y2="66" className="stroke-slate-900 stroke-[2.5]" />
                        <rect x="8" y="9" width="23" height="52" className="fill-sky-50/60 stroke-slate-700 stroke-[1.5]" />
                        <rect x="38" y="9" width="24" height="52" className="fill-sky-50/60 stroke-slate-700 stroke-[1.5]" />
                        <rect x="69" y="9" width="23" height="52" className="fill-sky-50/60 stroke-slate-700 stroke-[1.5]" />
                        <path d="M 42 35 L 58 35 M 53 31 L 58 35 L 53 39" className="stroke-sky-600 stroke-[2]" />
                    </g>
                )}
            </svg>
        </div>
    );
}

/**
 * Unified Document View Component (Customer Quotation & Invoice)
 * Identical layout for screen preview, print view, and PDF download.
 */
export default function CustomerQuotationView({ 
    quotation, 
    invoice, 
    document: customDoc, 
    type, 
    settings, 
    options = {} 
}) {
    const doc = quotation || invoice || customDoc;
    if (!doc) return null;

    const docType = (type || (invoice || doc.invoiceNumber ? 'INVOICE' : 'QUOTATION')).toUpperCase();
    const isInvoice = docType.includes('INVOICE');

    // Company branding from Settings
    const companyName = settings?.companyName || 'ALUECO ALUMINIUM SYSTEMS';
    const companyAddress = settings?.companyAddress || 'No. 123, Negoda Road, Weliweriya, Sri Lanka.';
    const companyPhone = settings?.companyPhone || '0777 140 680';
    const companyEmail = settings?.companyEmail || 'info@alueco.lk';
    const companyWebsite = settings?.companyWebsite || 'www.alueco.lk';
    const companyLogo = settings?.companyLogo;
    const secondaryLogo = settings?.secondaryLogo;

    // Document Metadata
    const docNumber = isInvoice ? (doc.invoiceNumber || 'INV-0001') : (doc.quoteNumber || 'QOT-0001');
    const rawDate = isInvoice ? doc.invoiceDate : doc.date;
    const rawExpireDate = isInvoice ? doc.dueDate : doc.validTill;
    const docDateStr = rawDate ? format(new Date(rawDate), 'dd MMM yyyy') : 'N/A';
    const expireDateStr = rawExpireDate ? format(new Date(rawExpireDate), 'dd MMM yyyy') : 'N/A';
    const preparedBy = doc.preparedBy || doc.salesRepName || 'ALUECO Team';

    // Customer & Project Metadata
    const customerName = isInvoice 
        ? (doc.customerSnapshot?.name || doc.customerName || 'Valued Customer') 
        : (doc.customerName || 'Valued Customer');
    const projectName = isInvoice
        ? (doc.salesOrderNumbers?.length ? `Order #${doc.salesOrderNumbers.join(', ')}` : (doc.projectName || 'Aluminium Systems Supply'))
        : (doc.projectName || 'Aluminium Installation');
    const location = isInvoice
        ? (doc.billingAddress?.city || doc.location || 'Sri Lanka')
        : (doc.location || 'Sri Lanka');
    const customerPhone = doc.customerPhone || doc.customerSnapshot?.phone || doc.billingAddress?.phone || 'N/A';
    const customerEmail = doc.customerEmail || doc.customerSnapshot?.email || 'N/A';
    const customerTaxNo = doc.customerSnapshot?.taxRegistrationNumber || doc.customerTaxId;

    // Options Configuration
    const includeVat = options.includeVat !== undefined 
        ? options.includeVat 
        : (doc.includeVat !== undefined ? doc.includeVat : true);
        
    const distributeTransportCost = options.distributeTransportCost !== undefined
        ? options.distributeTransportCost
        : (doc.distributeTransportCost !== undefined ? doc.distributeTransportCost : false);

    // Costs & Amounts Calculation
    const itemsList = doc.items || [];
    const transportCost = Number(doc.transportCost || doc.shippingCost || 0);
    
    // Calculate raw subtotal of items
    const rawItemsSubtotal = itemsList.reduce((sum, item) => {
        const qty = item.quantity || 1;
        const rate = item.unitPrice || 0;
        const lineTot = item.totalPrice || item.lineTotal || (qty * rate);
        return sum + lineTot;
    }, 0);

    // Calculate apportioned item prices if transport cost is distributed into items
    const processedItems = itemsList.map((item, idx) => {
        const qty = item.quantity || 1;
        const rawLineTotal = item.totalPrice || item.lineTotal || (qty * (item.unitPrice || 0));
        
        let apportionedTransport = 0;
        if (distributeTransportCost && transportCost > 0 && rawItemsSubtotal > 0) {
            apportionedTransport = (rawLineTotal / rawItemsSubtotal) * transportCost;
        }

        const finalLineTotal = rawLineTotal + apportionedTransport;
        const finalUnitPrice = qty > 0 ? (finalLineTotal / qty) : 0;

        return {
            ...item,
            displayUnitPrice: finalUnitPrice,
            displayLineTotal: finalLineTotal,
            apportionedTransport
        };
    });

    const subtotalExclTax = processedItems.reduce((sum, item) => sum + item.displayLineTotal, 0);

    // Show transport line item only if NOT distributed
    const visibleTransportCost = distributeTransportCost ? 0 : transportCost;

    // VAT Calculation
    const vatRate = includeVat ? 0.18 : 0;
    const vatBase = subtotalExclTax + visibleTransportCost;
    const vatAmount = vatBase * vatRate;
    const finalGrandTotal = vatBase + vatAmount;

    // Terms & Conditions Customization
    const defaultTerms = [
        'Quotation valid for 30 days from date of issue.',
        '60% advance payment required to commence fabrication.',
        'Balance 40% payment due upon completion & delivery.',
        'Any additional scope of work will be charged separately.',
        'Delivery timelines subject to site readiness & clear access.'
    ];

    let termsList = defaultTerms;
    if (options.customTerms || doc.termsAndConditions) {
        const rawT = options.customTerms || doc.termsAndConditions;
        termsList = typeof rawT === 'string' 
            ? rawT.split('\n').filter(t => t.trim()) 
            : (Array.isArray(rawT) ? rawT : defaultTerms);
    } else if (Array.isArray(doc.terms) && doc.terms.length > 0) {
        termsList = doc.terms;
    } else if (settings?.defaultTermsAndConditions) {
        termsList = settings.defaultTermsAndConditions.split('\n').filter(t => t.trim());
    }

    return (
        <div 
            id="customer-quotation-view-doc" 
            className="bg-white border border-slate-300 rounded-2xl shadow-xl w-[794px] min-h-[960px] mx-auto overflow-hidden font-sans text-slate-800 text-[11px] leading-tight flex flex-col justify-between print:w-[205mm] print:h-[285mm] print:max-h-[285mm] print:min-h-0 print:shadow-none print:border-none print:m-0 print:rounded-none print:overflow-hidden"
            style={{ boxSizing: 'border-box' }}
        >
            {/* Upper Content Area */}
            <div className="flex-1 space-y-0">
                {/* ── 1. HEADER SECTION (BALANCED DUAL LOGO HEADER) ───────────── */}
            <div className="p-3 px-4 border-b border-slate-200 flex flex-row justify-between items-start gap-4 bg-white">
                
                {/* Left: Primary & Secondary Brand Identity Logos together */}
                <div className="flex items-start gap-3.5">
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                        {companyLogo ? (
                            <img src={companyLogo} alt="Company Logo" className="h-12 w-auto object-contain max-w-[120px]" />
                        ) : (
                            <div className="w-12 h-12 bg-[#064E3B] text-white rounded-lg flex items-center justify-center font-black text-lg tracking-tighter shadow-sm">
                                A
                            </div>
                        )}
                        {secondaryLogo && (
                            <div className="pl-2 border-l border-slate-200 flex items-center justify-center h-12">
                                <img src={secondaryLogo} alt="Secondary Logo" className="h-11 w-auto object-contain max-w-[80px]" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h1 className="text-base font-black text-[#064E3B] tracking-tight uppercase">
                            {companyName}
                        </h1>
                        <div className="text-[10px] text-slate-600 font-medium mt-1 space-y-1">
                            <div className="flex items-center">
                                <MapPin size={11} className="text-[#064E3B] mr-1.5 flex-shrink-0" />
                                <span>{companyAddress}</span>
                            </div>
                            <div className="flex items-center flex-wrap gap-x-4">
                                <div className="flex items-center">
                                    <Phone size={11} className="text-[#064E3B] mr-1 flex-shrink-0" />
                                    <span>{companyPhone}</span>
                                </div>
                                <div className="flex items-center">
                                    <Mail size={11} className="text-[#064E3B] mr-1 flex-shrink-0" />
                                    <span>{companyEmail}</span>
                                </div>
                            </div>
                            <div className="flex items-center text-slate-500">
                                <Globe size={11} className="text-[#064E3B] mr-1.5 flex-shrink-0" />
                                <span>{companyWebsite}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Document Banner */}
                <div className="flex flex-col items-end">
                    <table style={{ display: 'inline-table', borderCollapse: 'collapse', margin: 0, padding: 0 }}>
                        <tbody>
                            <tr>
                                <td data-pdf-badge="main" style={{ backgroundColor: '#064E3B', color: '#ffffff', borderRadius: '6px', fontWeight: 900, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 16px', textAlign: 'center', verticalAlign: 'middle', height: '24px', whiteSpace: 'nowrap' }}>
                                    {docType}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="mt-2 text-[10px] space-y-0.5 text-right font-medium text-slate-700">
                        <p><span className="text-slate-400">{isInvoice ? 'Invoice No :' : 'Quote No :'}</span> <strong className="text-slate-900 font-bold">{docNumber}</strong></p>
                        <p><span className="text-slate-400">{isInvoice ? 'Invoice Date :' : 'Quote Date :'}</span> <strong>{docDateStr}</strong></p>
                        <p><span className="text-slate-400">{isInvoice ? 'Due Date :' : 'Valid Till :'}</span> <strong>{expireDateStr}</strong></p>
                        <p><span className="text-slate-400">Prepared By :</span> <strong>{preparedBy}</strong></p>
                    </div>
                </div>
            </div>

            {/* ── 2. METADATA CARDS (Customer & Project Details) ───────────── */}
            <div className="p-3 grid grid-cols-2 gap-3 bg-slate-50/50 border-b border-slate-200">
                
                {/* Left Card: Customer Details */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                    <table style={{ display: 'inline-table', borderCollapse: 'collapse', margin: '0 0 8px 0', padding: 0 }}>
                        <tbody>
                            <tr>
                                <td data-pdf-badge="card" style={{ backgroundColor: '#064E3B', color: '#ffffff', borderRadius: '4px', fontWeight: 800, fontSize: '8.5px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 10px', textAlign: 'center', verticalAlign: 'middle', height: '20px', whiteSpace: 'nowrap' }}>
                                    CUSTOMER DETAILS
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="space-y-1 text-[10px]">
                        <div className="flex"><span className="w-28 text-slate-400 font-medium">Customer Name :</span><strong className="text-slate-900">{customerName}</strong></div>
                        <div className="flex"><span className="w-28 text-slate-400 font-medium">Company / Project :</span><span className="text-slate-800">{projectName}</span></div>
                        <div className="flex"><span className="w-28 text-slate-400 font-medium">Address :</span><span className="text-slate-800">{location}</span></div>
                        <div className="flex"><span className="w-28 text-slate-400 font-medium">Phone :</span><span className="text-slate-800">{customerPhone}</span></div>
                        <div className="flex"><span className="w-28 text-slate-400 font-medium">Email :</span><span className="text-slate-800">{customerEmail}</span></div>
                        {customerTaxNo && <div className="flex"><span className="w-28 text-slate-400 font-medium">VAT Reg No :</span><span className="text-slate-900 font-bold">{customerTaxNo}</span></div>}
                    </div>
                </div>

                {/* Right Card: Document Details */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                    <table style={{ display: 'inline-table', borderCollapse: 'collapse', margin: '0 0 8px 0', padding: 0 }}>
                        <tbody>
                            <tr>
                                <td data-pdf-badge="card" style={{ backgroundColor: '#064E3B', color: '#ffffff', borderRadius: '4px', fontWeight: 800, fontSize: '8.5px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 10px', textAlign: 'center', verticalAlign: 'middle', height: '20px', whiteSpace: 'nowrap' }}>
                                    {isInvoice ? 'INVOICE DETAILS' : 'PROJECT DETAILS'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div className="space-y-1 text-[10px]">
                        <div className="flex"><span className="w-24 text-slate-400 font-medium">Project Name :</span><strong className="text-slate-900">{projectName}</strong></div>
                        <div className="flex"><span className="w-24 text-slate-400 font-medium">Location :</span><span className="text-slate-800">{location}</span></div>
                        {doc.description && (
                            <div className="flex"><span className="w-24 text-slate-400 font-medium">Scope/Notes :</span><span className="text-slate-800 font-medium">{doc.description}</span></div>
                        )}
                        <div className="flex"><span className="w-24 text-slate-400 font-medium">Requirement :</span><span className="text-slate-800">Aluminium Doors &amp; Windows</span></div>
                        <div className="flex"><span className="w-24 text-slate-400 font-medium">Payment Terms :</span><span className="text-slate-800 font-semibold text-emerald-700">60% Advance / 40% Completion</span></div>
                        <div className="flex"><span className="w-24 text-slate-400 font-medium">Delivery :</span><span className="text-slate-800">To be Advised</span></div>
                    </div>
                </div>
            </div>

            {/* ── 3. ITEMS TABLE SUMMARY ───────────────────────────────────── */}
            <div className="p-3 space-y-1.5">
                
                {/* Section Title */}
                <div className="flex items-center gap-1.5">
                    <table style={{ display: 'inline-table', borderCollapse: 'collapse', margin: 0, padding: 0 }}>
                        <tbody>
                            <tr>
                                <td data-pdf-badge="circle" style={{ backgroundColor: '#064E3B', color: '#ffffff', borderRadius: '50%', fontWeight: 800, fontSize: '9px', width: '16px', height: '16px', textAlign: 'center', verticalAlign: 'middle', padding: 0 }}>
                                    1
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <h2 className="text-xs font-black text-[#064E3B] tracking-wide uppercase">
                        {isInvoice ? 'INVOICE LINE ITEMS' : 'QUOTATION SUMMARY (CUSTOMER VIEW)'}
                    </h2>
                </div>

                {/* Items Table */}
                <div className="border border-slate-800 rounded-lg overflow-hidden shadow-sm">
                    <table className="w-full text-left text-[10px] border-collapse">
                        <thead>
                            <tr className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white font-extrabold border-b border-slate-800 text-[10px] tracking-wide">
                                <th className="p-2 w-7 text-center">#</th>
                                <th className="p-2 w-16 text-center">Sketch</th>
                                <th className="p-2 min-w-[190px]">Description &amp; Specifications</th>
                                <th className="p-2 w-20 text-center">Size (W&times;H mm)</th>
                                <th className="p-2 w-10 text-center">Qty</th>
                                <th className="p-2 w-24 text-right">Unit Rate (LKR)</th>
                                <th className="p-2 w-24 text-right">Total (LKR)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {processedItems.map((item, index) => {
                                const appType = item.applicationType || 'Sliding Window System';
                                const config = item.configuration || 'Standard Profile';
                                const itemWidth = item.width || 0;
                                const itemHeight = item.height || 0;

                                return (
                                    <tr key={index} className={index % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                                        <td className="p-2 text-center font-bold text-slate-700 border-r border-slate-200">
                                            {index + 1}
                                        </td>
                                        <td className="p-1 text-center border-r border-slate-200 bg-slate-900/5">
                                            <ApplicationSketchDiagram
                                                type={appType}
                                                configuration={config}
                                                className="w-14 h-14 mx-auto rounded bg-slate-950 p-0.5 border border-slate-300 shadow-xs"
                                            />
                                        </td>
                                        <td className="p-2 border-r border-slate-200 space-y-0.5">
                                            <p className="font-extrabold text-slate-900 text-[11px]">
                                                {appType}
                                            </p>
                                            <p className="text-slate-600 font-semibold text-[9.5px]">
                                                {config}
                                            </p>
                                            {item.description && (
                                                <p className="text-emerald-950 font-medium text-[9.5px] bg-slate-50 p-1 rounded border border-slate-100 italic">
                                                    {item.description}
                                                </p>
                                            )}
                                            <div className="mt-1 pt-1 border-t border-slate-100 text-[9px] text-slate-600 space-y-0.5 font-normal">
                                                <p>• <strong>Profile:</strong> {item.profileSpec || item.profile || 'Swisstek 100mm Series (1.2-1.5mm Thickness, Powder Coated)'}</p>
                                                <p>• <strong>Glass:</strong> {item.glassSpec || item.glass || '5mm Single Tempered Clear Glass'}</p>
                                                <p>• <strong>Hardware:</strong> {item.hardwareSpec || item.hardware || 'Kinlong / 3H Heavy Duty Touch Locks, Rollers & Seals'}</p>
                                                <p>• <strong>Scope:</strong> {item.scopeSpec || item.scope || 'Fabrication, Delivery & Installation Inclusive'}</p>
                                            </div>
                                        </td>
                                        <td className="p-2 text-center border-r border-slate-200 font-mono font-bold text-slate-800">
                                            {itemWidth} &times; {itemHeight}
                                        </td>
                                        <td className="p-2 text-center font-bold text-slate-900 border-r border-slate-200">
                                            {item.quantity || 1}
                                        </td>
                                        <td className="p-2 text-right font-mono text-slate-800 border-r border-slate-200">
                                            {item.displayUnitPrice.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-2 text-right font-mono font-extrabold text-slate-950">
                                            {item.displayLineTotal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-100 border-t-2 border-slate-800 text-[10px] font-black">
                                <td colSpan="6" className="p-2 text-right text-emerald-900 uppercase tracking-wide border-r border-slate-300">
                                    SUBTOTAL (EXCLUDING TAX)
                                </td>
                                <td className="p-2 text-right font-mono text-emerald-950 text-[11px]">
                                    {subtotalExclTax.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* ── 4. AMOUNT SUMMARY & INCLUDED / WARRANTY SECTION ─────────── */}
            <div className="p-3 grid grid-cols-2 gap-3 bg-white">
                
                {/* Left Card: Amount Summary */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-2 flex flex-col justify-between">
                    <div>
                        <table style={{ display: 'inline-table', borderCollapse: 'collapse', margin: '0 0 8px 0', padding: 0 }}>
                            <tbody>
                                <tr>
                                    <td data-pdf-badge="card" style={{ backgroundColor: '#064E3B', color: '#ffffff', borderRadius: '4px', fontWeight: 800, fontSize: '8.5px', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 10px', textAlign: 'center', verticalAlign: 'middle', height: '20px', whiteSpace: 'nowrap' }}>
                                        AMOUNT SUMMARY
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div className="space-y-1 text-[10px] font-medium text-slate-700">
                            <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                                <span>
                                    Sub Total {distributeTransportCost ? '(Transport Included into Items)' : ''}
                                </span>
                                <span className="font-mono font-bold text-slate-900">
                                    LKR {subtotalExclTax.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>

                            {!distributeTransportCost && transportCost > 0 && (
                                <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                                    <span>Transport &amp; Handling Cost</span>
                                    <span className="font-mono font-bold text-slate-900">
                                        LKR {transportCost.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-center py-0.5 border-b border-slate-100">
                                <span>VAT {includeVat ? '(18%)' : '(Exempt / Not Included)'}</span>
                                <span className="font-mono font-bold text-slate-900">
                                    {includeVat ? `LKR ${vatAmount.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'LKR 0.00'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Final Highlighted Total Banner */}
                    <div className="bg-[#064E3B] text-white p-2.5 rounded-lg shadow-md flex justify-between items-center mt-1">
                        <div>
                            <span className="block text-[8.5px] font-bold tracking-widest uppercase text-emerald-200">
                                {isInvoice ? 'FINAL INVOICE VALUE' : 'FINAL QUOTATION VALUE'}
                            </span>
                            <span className="text-[9px] text-emerald-100 font-medium">
                                {includeVat ? '(Including 18% VAT)' : '(Excluding VAT)'}
                            </span>
                        </div>
                        <div className="text-right font-mono font-black text-base text-white">
                            <span className="text-[9px] text-emerald-200 font-normal mr-1">LKR</span>
                            {finalGrandTotal.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* Right Card: Quotation Checklist & Warranty */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
                    <div>
                        <h3 className="text-[9.5px] font-black text-[#064E3B] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-600" />
                            THIS {docType} INCLUDES
                        </h3>
                        <ul className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9.5px] text-slate-700 font-medium">
                            <li className="flex items-center gap-1"><span className="text-emerald-600 font-bold">✓</span> Aluminium profiles (Swisstek)</li>
                            <li className="flex items-center gap-1"><span className="text-emerald-600 font-bold">✓</span> 5mm Tempered Glass</li>
                            <li className="flex items-center gap-1"><span className="text-emerald-600 font-bold">✓</span> Accessories (Kinlong / 3H)</li>
                            <li className="flex items-center gap-1"><span className="text-emerald-600 font-bold">✓</span> Silicone Weatherproof</li>
                            <li className="flex items-center gap-1"><span className="text-emerald-600 font-bold">✓</span> Labour &amp; Installation</li>
                            <li className="flex items-center gap-1"><span className="text-emerald-600 font-bold">✓</span> Transport to Site</li>
                        </ul>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200">
                        <h3 className="text-[9.5px] font-black text-[#064E3B] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <ShieldCheck size={11} className="text-emerald-600" />
                            WARRANTY
                        </h3>
                        <div className="space-y-0.5 text-[9.5px] text-slate-700">
                            <div className="flex justify-between"><span>Powder Coating Surface :</span><strong className="text-slate-900">10 Years</strong></div>
                            <div className="flex justify-between"><span>Accessories (Kinlong/3H/BP) :</span><strong className="text-slate-900">2 Years</strong></div>
                            <div className="flex justify-between"><span>Fabrication Work :</span><strong className="text-slate-900">10 Years</strong></div>
                        </div>
                    </div>
                </div>

            </div>
            </div>

            {/* Bottom Pinned Footer & Signatures Container */}
            <div className="mt-auto border-t border-slate-200">
                {/* ── 5. CUSTOMIZABLE TERMS & CONDITIONS & SIGNATURE SPACE ──────── */}
                <div className="p-3 space-y-2 bg-white">
                
                {/* Terms */}
                <div>
                    <h3 className="text-[9.5px] font-black text-[#064E3B] uppercase tracking-wider mb-1">
                        TERMS &amp; CONDITIONS
                    </h3>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9.5px] text-slate-600 font-medium">
                        {termsList.map((term, idx) => {
                            const cleanTerm = String(term).replace(/^\d+[\.\)]\s*/, '');
                            return (
                                <li key={idx} className="flex items-start gap-1">
                                    <span className="font-bold text-slate-800 flex-shrink-0">{idx + 1}.</span>
                                    <span>{cleanTerm}</span>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                {/* Signatures & Seal (Dedicated Vertical Height for Physical Signing & Dating) */}
                <div className="pt-2 flex flex-row justify-between items-end gap-4 border-t border-slate-100">
                    
                    {/* Customer Signature Space */}
                    <div className="w-48 text-center space-y-1">
                        <div className="border-b border-slate-400 h-10 flex items-end justify-center pb-1">
                            <span className="text-[9px] text-slate-300 italic">Sign Here</span>
                        </div>
                        <p className="text-[9.5px] font-bold text-slate-700 uppercase tracking-wide">Customer Signature</p>
                        <div className="flex justify-between items-center text-[9px] text-slate-600 pt-0.5 border-t border-dashed border-slate-200">
                            <span className="font-semibold text-slate-500">Date :</span>
                            <span className="border-b border-slate-400 w-32 inline-block"></span>
                        </div>
                    </div>

                    {/* Thank You Note & Company Slogan */}
                    <div className="text-center py-0.5 space-y-0.5 max-w-[240px]">
                        <p className="font-bold text-slate-800 text-[10.5px] leading-tight">
                            Thank you for Choosing ALUECO
                        </p>
                        <p className="italic text-emerald-800 font-semibold text-[9.5px] leading-tight font-serif">
                            Shaping a Greener Tomorrow Today....
                        </p>
                        <p className="font-black text-slate-900 text-[9.5px] uppercase tracking-wider leading-tight">
                            LUXO CONSTRUCTION PRIVATE LIMITED
                        </p>
                    </div>

                    {/* Authorised Signature Space */}
                    <div className="w-48 text-center space-y-1">
                        <div className="border-b border-slate-400 h-10 flex items-end justify-center pb-1">
                            <span className="font-serif italic text-slate-500 text-[10px]">ALUECO Authorised Signature</span>
                        </div>
                        <p className="text-[9.5px] font-bold text-slate-700 uppercase tracking-wide">Authorised Signature</p>
                        <div className="flex justify-between items-center text-[9px] text-slate-600 pt-0.5 border-t border-dashed border-slate-200">
                            <span className="font-semibold text-slate-500">Date :</span>
                            <span className="border-b border-slate-400 w-32 inline-block"></span>
                        </div>
                    </div>
                </div>

            </div>

            {/* ── 6. BOTTOM FOOTER BAR ────────────────────────────────────── */}
            <div className="bg-[#064E3B] text-white p-2.5 px-4 text-[9.5px] font-medium flex flex-row justify-between items-center gap-2">
                <div className="flex items-center gap-1"><Phone size={10} className="text-emerald-300" /> {companyPhone}</div>
                <div className="flex items-center gap-1"><Mail size={10} className="text-emerald-300" /> {companyEmail}</div>
                <div className="flex items-center gap-1"><Globe size={10} className="text-emerald-300" /> {companyWebsite}</div>
                <div className="flex items-center gap-1"><MapPin size={10} className="text-emerald-300" /> {companyAddress}</div>
            </div>
            </div>

        </div>
    );
}
