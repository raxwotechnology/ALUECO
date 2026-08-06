import React from 'react';
import WarrantyTermsPrint from './WarrantyTermsPrint';

export default function AluAgreementPrintView({ agreement }) {
    if (!agreement) return null;

    const {
        agreementNumber = 'PA-200',
        quotationNumber = 'QOT-231',
        agreementDate = new Date(),
        contractorDetails = {
            companyName: 'LUXO Construction (Pvt) Ltd',
            experienceCenter: 'ALUECO Experience Center',
            address: 'No.145B, Wallawatta, Weliweriya',
            phone1: '0742899977',
            phone2: '0777140680',
            website: 'www.luxoconstruction.com'
        },
        customerDetails = {
            customerName: 'Mr.Shashika Rodrigo',
            projectLocation: '22/25, Army housing scheme, Dhawatagahawatta, Thalangama north, Koswatta, Battaramulla',
            contactNo: '0767204946'
        },
        projectValue = 1650000,
        paymentSchedule = [
            { stageName: 'Order Confirmation Advance', amount: 900000 },
            { stageName: 'Project Progress Payment', amount: 300000 },
            { stageName: 'Final Payment Upon Project Completion', amount: 450000 }
        ],
        scopeOfWork = 'LUXO Construction (Pvt) Ltd agrees to supply, fabricate, deliver, and install the aluminium works as detailed in the approved quotation. Any additional work requested outside the approved quotation shall be treated as a variation and charged separately.',
        leadTimeDays = 14,
        warranties = { workmanshipYears: 10, hardwareYears: 5 },
        generalConditions = 'All payments shall follow the agreed schedule. Variations will be charged separately. Final handover will be after full payment.',
        bankDetails = {
            bankName: 'Hatton National Bank',
            accountName: 'M.E.H.Bandara',
            accountNumber: '147020135728',
            branch: 'Nawala'
        }
    } = agreement;

    const formattedDate = new Date(agreementDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const totalScheduleAmount = paymentSchedule.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    return (
        <div className="bg-white text-slate-900 font-sans p-8 max-w-[800px] mx-auto text-sm print:p-0 print:max-w-none">
            {/* Header: Company Logo & Contact Details */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="text-2xl font-black text-slate-900 tracking-tighter uppercase font-serif">
                            <span className="text-indigo-900">LUXO</span>
                        </div>
                    </div>
                    <span className="block text-[11px] font-extrabold tracking-widest text-slate-600 uppercase">
                        CONSTRUCTION
                    </span>
                </div>
                <div className="text-right text-[11px] text-slate-600 space-y-0.5">
                    <p className="font-semibold">No 115, Hilariyan Land, Madawala, Kirindiwela, Sri Lanka</p>
                    <p className="text-indigo-700 font-mono">www.luxoconstruction.com</p>
                    <p className="font-mono">0742899977 / 0777140680</p>
                </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6">
                <h1 className="text-xl font-extrabold uppercase tracking-widest text-slate-900">
                    PROJECT AGREEMENT
                </h1>
            </div>

            {/* Metadata & Parties */}
            <div className="space-y-4 mb-6 text-xs">
                <div className="space-y-1">
                    <p><span className="font-bold text-slate-700">Agreement No:</span> <span className="font-mono font-bold text-indigo-950">{agreementNumber}</span></p>
                    <p><span className="font-bold text-slate-700">Quotation Reference:</span> <span className="font-mono font-bold">{quotationNumber}</span></p>
                    <p><span className="font-bold text-slate-700">Agreement Date:</span> <span className="font-mono">{formattedDate}</span></p>
                </div>

                <div className="pt-2">
                    <h3 className="font-extrabold text-slate-800 text-sm mb-1 text-indigo-900">Contractor</h3>
                    <p className="font-bold text-slate-900">{contractorDetails.companyName || 'LUXO Construction (Pvt) Ltd'}</p>
                    <p>{contractorDetails.experienceCenter || 'ALUECO Experience Center'}</p>
                    <p>{contractorDetails.address || 'No.145B, Wallawatta, Weliweriya'}</p>
                </div>

                <div className="pt-2">
                    <h3 className="font-extrabold text-slate-800 text-sm mb-1 text-indigo-900">Customer Details</h3>
                    <p><span className="font-bold text-slate-700">Customer Name:</span> {customerDetails.customerName}</p>
                    <p><span className="font-bold text-slate-700">Project Location:</span> {customerDetails.projectLocation}</p>
                    <p><span className="font-bold text-slate-700">Contact No:</span> <span className="font-mono">{customerDetails.contactNo}</span></p>
                </div>
            </div>

            {/* 1. Project Value */}
            <div className="space-y-2 mb-6">
                <h3 className="font-bold text-slate-900 text-sm">1. Project Value</h3>
                <table className="w-full border-collapse border border-slate-400 text-xs">
                    <thead>
                        <tr className="bg-slate-100 font-bold border-b border-slate-400">
                            <th className="border border-slate-400 p-2 text-left">Description</th>
                            <th className="border border-slate-400 p-2 text-right">Amount (LKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-slate-400 p-2 font-semibold">Total Project Value</td>
                            <td className="border border-slate-400 p-2 text-right font-mono font-bold">
                                {Number(projectValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 2. Payment Schedule */}
            <div className="space-y-2 mb-6">
                <h3 className="font-bold text-slate-900 text-sm">2. Payment Schedule</h3>
                <table className="w-full border-collapse border border-slate-400 text-xs">
                    <thead>
                        <tr className="bg-slate-100 font-bold border-b border-slate-400">
                            <th className="border border-slate-400 p-2 text-left">Payment Stage</th>
                            <th className="border border-slate-400 p-2 text-right">Amount (LKR)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paymentSchedule.map((stage, i) => (
                            <tr key={i}>
                                <td className="border border-slate-400 p-2 font-medium">{stage.stageName}</td>
                                <td className="border border-slate-400 p-2 text-right font-mono font-semibold">
                                    {Number(stage.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                            </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold">
                            <td className="border border-slate-400 p-2">Total Contract Value</td>
                            <td className="border border-slate-400 p-2 text-right font-mono font-bold text-indigo-950">
                                {Number(totalScheduleAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 3. Scope of Work */}
            <div className="space-y-1 mb-6">
                <h3 className="font-bold text-slate-900 text-sm">3. Scope of Work</h3>
                <p className="text-slate-700 leading-relaxed text-xs">
                    {scopeOfWork}
                </p>
            </div>

            {/* Page Break for Print if needed */}
            <div className="page-break my-6 print:break-before-page"></div>

            {/* 4. Project Lead Time */}
            <div className="space-y-1 mb-6">
                <h3 className="font-bold text-slate-900 text-sm">4. Project Lead Time</h3>
                <p className="text-slate-700 leading-relaxed text-xs">
                    The project will be completed within <span className="font-bold">{leadTimeDays} working days</span> after the Contractor has taken and confirmed the final site measurements and received the Order Confirmation Advance.
                </p>
            </div>

            {/* 5. Warranty */}
            {/* 5. Warranty Terms & Conditions */}
            <div className="mb-6">
                <WarrantyTermsPrint compact={false} />
            </div>

            {/* 6. General Conditions */}
            <div className="space-y-1 mb-6">
                <h3 className="font-bold text-slate-900 text-sm">6. General Conditions</h3>
                <p className="text-slate-700 leading-relaxed text-xs">
                    {generalConditions}
                </p>
            </div>

            {/* 7. Bank Details */}
            <div className="space-y-1 mb-6 text-xs text-slate-800">
                <h3 className="font-bold text-slate-900 text-sm mb-1">7. Bank Details</h3>
                <p><span className="font-bold">Bank Name:</span> {bankDetails.bankName}</p>
                <p><span className="font-bold">Account Name:</span> {bankDetails.accountName}</p>
                <p><span className="font-bold">Account Number:</span> <span className="font-mono font-bold">{bankDetails.accountNumber}</span></p>
                <p><span className="font-bold">Branch:</span> {bankDetails.branch}</p>
                <p className="text-[11px] text-slate-500 italic mt-2">
                    Note: All payments shall be made to the above bank account. The Customer is requested to send the payment slip or transaction reference to the Contractor immediately after each payment.
                </p>
            </div>

            {/* 8. Acceptance Signatures Box */}
            <div className="space-y-2 mt-8">
                <h3 className="font-bold text-slate-900 text-sm">8. Acceptance</h3>
                <p className="text-xs text-slate-600 mb-2">By signing below, both parties accept the terms and conditions of this Project Agreement.</p>
                
                <table className="w-full border-collapse border border-slate-400 text-xs">
                    <thead>
                        <tr className="bg-slate-100 font-bold border-b border-slate-400">
                            <th className="border border-slate-400 p-2.5 w-1/2 text-left">Customer</th>
                            <th className="border border-slate-400 p-2.5 w-1/2 text-left">Contractor</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-slate-400 p-3 vertical-top space-y-8 min-h-[140px]">
                                <div>
                                    <p><span className="font-bold">Name:</span> {customerDetails.customerName}</p>
                                </div>
                                <div className="pt-8">
                                    <p className="border-t border-slate-400 pt-1 text-slate-600 font-semibold">Signature:</p>
                                </div>
                                <div className="pt-4">
                                    <p><span className="font-bold">Date:</span> {formattedDate}</p>
                                </div>
                            </td>
                            <td className="border border-slate-400 p-3 vertical-top space-y-4 min-h-[140px] relative">
                                <div>
                                    <p className="font-bold">Authorized Representative Signature:</p>
                                </div>
                                <div className="py-4 text-center">
                                    <div className="inline-block border-2 border-indigo-900 text-indigo-900 font-black p-2 text-[11px] uppercase tracking-wider rounded border-dashed opacity-80">
                                        LUXO CONSTRUCTION (PVT) LTD<br/>
                                        PV 00304099<br/>
                                        <span className="font-serif italic font-normal text-xs text-slate-800">Bandara</span><br/>
                                        Signature
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <p><span className="font-bold">Date:</span> <span className="font-mono">{formattedDate}</span></p>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
