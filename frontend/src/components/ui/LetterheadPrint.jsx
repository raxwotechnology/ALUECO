import React from 'react';

export default function LetterheadPrint({ title, docNumber, date, customer, items, totals, children }) {
    return (
        <div className="hidden print:block p-8 bg-white text-slate-900 font-sans text-xs">
            {/* Letterhead Header */}
            <div className="border-b-2 border-indigo-900 pb-4 mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-black tracking-wider text-indigo-950">ALUECO ALUMINIUM SYSTEMS</h1>
                    <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest mt-0.5">Premium Aluminium Fabrication & ERP Systems</p>
                    <p className="text-slate-500 text-[10px] mt-1">123 Industrial Zone, Colombo, Sri Lanka | Tel: +94 11 234 5678 | Email: info@alueco.lk</p>
                </div>
                <div className="text-right">
                    <span className="text-lg font-bold text-indigo-900 uppercase tracking-wider block">{title}</span>
                    <p className="font-mono text-sm font-bold text-slate-800">#{docNumber}</p>
                    <p className="text-slate-500 text-[10px] mt-0.5">Date: {new Date(date || Date.now()).toLocaleDateString('en-LK')}</p>
                </div>
            </div>

            {/* Customer Details */}
            {customer && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-6 grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer / Bill To</p>
                        <p className="font-bold text-sm text-slate-900 mt-0.5">{customer.name || customer.displayName}</p>
                        <p className="text-slate-600">{customer.code}</p>
                        <p className="text-slate-600">{customer.phone}</p>
                    </div>
                    {customer.address && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Address</p>
                            <p className="text-slate-700 mt-0.5">{customer.address}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Document Content / Body */}
            {children}

            {/* Printable Footer */}
            <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end text-[10px] text-slate-500">
                <div>
                    <p className="font-semibold text-slate-700">Thank you for doing business with ALUECO Systems.</p>
                    <p>Computer generated document — No signature required.</p>
                </div>
                <div className="text-center w-40 border-t border-slate-400 pt-1">
                    <p className="font-bold text-slate-800">Authorized Signature</p>
                </div>
            </div>
        </div>
    );
}
