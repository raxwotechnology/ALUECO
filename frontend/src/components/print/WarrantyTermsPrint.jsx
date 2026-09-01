import React from 'react';

/**
 * Official Warranty Terms and Conditions block for invoices, POS receipts, and agreements.
 */
export default function WarrantyTermsPrint({ compact = false }) {
    if (compact) {
        return (
            <div className="mt-4 pt-3 border-t border-dashed border-gray-400 text-[9px] leading-tight text-gray-700">
                <p className="font-bold uppercase tracking-wider text-[10px] text-gray-900 mb-1 text-center">
                    Warranty Terms &amp; Conditions Summary
                </p>
                <ul className="space-y-1 list-disc pl-3">
                    <li><strong>Aluminium Profiles:</strong> 10-yr powder coating &amp; 5-yr surface finish warranty against peeling/cracking under normal usage.</li>
                    <li><strong>Accessories:</strong> 2-yr warranty on KINLONG, 3H &amp; BP hardware against manufacturing defects.</li>
                    <li><strong>Fabrication Work:</strong> 10-yr warranty guaranteeing workmanship &amp; structural integrity.</li>
                    <li><strong>Sealants &amp; Weatherproofing:</strong> DOWSIL, SOUDAL &amp; FINOTECH weatherproof silicone protection.</li>
                </ul>
            </div>
        );
    }

    return (
        <div className="mt-8 pt-6 border-t-2 border-slate-300 text-slate-800 font-sans text-xs">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2 border-b pb-1 border-slate-300">
                Warranty Terms and Conditions
            </h3>
            
            <p className="text-slate-600 mb-4 leading-relaxed font-medium">
                We are committed to providing high-quality aluminium fabrication services. Our warranty ensures peace of mind for our customers and covers the following:
            </p>

            <div className="space-y-3.5">
                <div>
                    <h4 className="font-bold text-slate-900 text-xs">01. Aluminium Profiles:</h4>
                    <p className="text-slate-700 leading-relaxed mt-0.5">
                        A 10-year warranty is provided for powder coating and a 05-year warranty for the surface finish of all aluminium profiles used in our projects, ensuring durability and resistance against peeling, cracking, or significant discolouration under normal usage conditions.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold text-slate-900 text-xs">02. Accessories:</h4>
                    <p className="text-slate-700 leading-relaxed mt-0.5">
                        We use premium accessories from KINLONG, 3H, and BP, all of which come with a 2-year warranty against manufacturing defects.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold text-slate-900 text-xs">03. Fabrication Work:</h4>
                    <p className="text-slate-700 leading-relaxed mt-0.5">
                        Our fabrication work is backed by a 10-year warranty, guaranteeing high-quality workmanship, structural integrity, and adherence to industrial standards.
                    </p>
                </div>

                <div>
                    <h4 className="font-bold text-slate-900 text-xs">04. Sealants and Weatherproofing:</h4>
                    <p className="text-slate-700 leading-relaxed mt-0.5">
                        We use trusted brands such as DOWSIL, SOUDAL, and FINOTECH for weatherproof silicone sealing, ensuring excellent protection against water, dust, and environmental wear. These products adhere to stringent quality standards, enhancing the durability and performance of our installations.
                    </p>
                </div>
            </div>
        </div>
    );
}
