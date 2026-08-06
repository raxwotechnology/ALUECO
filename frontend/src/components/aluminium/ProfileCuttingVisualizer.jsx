import React, { useState } from 'react';
import { Layers, Scissors, CheckCircle, AlertTriangle, BarChart3, Info } from 'lucide-react';
import { solveMultiLengthCutting } from '../../utils/profileCuttingOptimizer';

export default function ProfileCuttingVisualizer({ profileCuts = [], profileCode = 'ALU-PROFILE' }) {
    // Extract array of cut lengths
    const cutsArray = profileCuts.flatMap(p => {
        const length = Math.round(p.length);
        const qty = p.qty || 1;
        return Array.from({ length: qty }, () => length);
    });

    // Run 1D Multi-Length Bin Packing Solver
    const optResult = solveMultiLengthCutting(cutsArray);

    // Color palette for cut segments
    const segmentColors = [
        'bg-indigo-600 border-indigo-700 text-white',
        'bg-emerald-600 border-emerald-700 text-white',
        'bg-sky-600 border-sky-700 text-white',
        'bg-amber-600 border-amber-700 text-white',
        'bg-purple-600 border-purple-700 text-white',
        'bg-teal-600 border-teal-700 text-white'
    ];

    return (
        <div className="space-y-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-xs font-sans">
            {/* Header & Overall Metrics Banner */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
                <div>
                    <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        <Scissors className="text-indigo-600" size={18} /> 1D Profile Cutting & Stock Bar Optimization Diagram
                    </h3>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                        Smart stock bar length selection (8ft, 14ft, 16ft, 21ft) to minimize off-cut wastage and raw material cost.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Overall Efficiency:</span>
                    <span className={`px-3 py-1 rounded-full font-black text-xs ${optResult.efficiencyPercent >= 90 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'}`}>
                        {optResult.efficiencyPercent}% Utilized ({optResult.wastePercent}% Wastage)
                    </span>
                </div>
            </div>

            {/* Metrics Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Total Stock Bars Required</span>
                    <span className="text-base font-black text-slate-800 mt-0.5 block font-mono">
                        {optResult.totalBarsCount} Bars
                    </span>
                </div>
                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-emerald-600">Total Utilized Length</span>
                    <span className="text-base font-black text-emerald-800 mt-0.5 block font-mono">
                        {(optResult.totalUtilizedLengthMm / 1000).toFixed(2)} m ({(optResult.totalUtilizedLengthMm / 304.8).toFixed(1)} ft)
                    </span>
                </div>
                <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-200">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-rose-600">Off-Cut Wastage Loss</span>
                    <span className="text-base font-black text-rose-700 mt-0.5 block font-mono">
                        {(optResult.totalWastageMm / 1000).toFixed(2)} m ({(optResult.totalWastageMm / 304.8).toFixed(1)} ft)
                    </span>
                </div>
                <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-indigo-600">Total Purchased Stock Length</span>
                    <span className="text-base font-black text-indigo-800 mt-0.5 block font-mono">
                        {(optResult.totalPurchasedLengthMm / 1000).toFixed(2)} m ({(optResult.totalPurchasedLengthMm / 304.8).toFixed(1)} ft)
                    </span>
                </div>
            </div>

            {/* Visual Stock Bar Allocations */}
            <div className="space-y-4 pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1 flex items-center justify-between">
                    <span>Allocated Extrusion Stock Bars Layout ({optResult.bars.length})</span>
                    <span className="text-[10px] text-slate-400 font-mono normal-case font-normal">3mm saw kerf blade loss calculated per cut</span>
                </h4>

                {optResult.bars.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 italic">No profile cuts to optimize.</p>
                ) : (
                    optResult.bars.map((bar, barIdx) => {
                        const lengthFt = (bar.lengthMm / 304.8).toFixed(0);
                        const utilPercent = ((bar.usedMm / bar.lengthMm) * 100).toFixed(1);

                        return (
                            <div key={barIdx} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                                {/* Bar Header */}
                                <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center font-mono text-[10px]">
                                            #{barIdx + 1}
                                        </span>
                                        <span className="font-extrabold text-indigo-700 font-mono">
                                            {lengthFt} ft Stock Bar ({bar.lengthMm} mm)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px]">
                                        <span className="text-slate-500 font-mono">Used: {bar.usedMm} mm</span>
                                        <span className={bar.wasteMm > 0 ? 'text-rose-600 font-mono font-bold' : 'text-emerald-600 font-mono font-bold'}>
                                            Off-cut Waste: {bar.wasteMm} mm ({((bar.wasteMm / bar.lengthMm) * 100).toFixed(1)}%)
                                        </span>
                                    </div>
                                </div>

                                {/* Graphical 1D Cutting Stock Bar Diagram */}
                                <div className="relative h-9 bg-slate-200 rounded-lg overflow-hidden flex border border-slate-300 shadow-inner">
                                    {bar.cuts.map((cutLen, cutIdx) => {
                                        const segmentWidthPercent = (cutLen / bar.lengthMm) * 100;
                                        const colorClass = segmentColors[cutIdx % segmentColors.length];

                                        return (
                                            <div
                                                key={cutIdx}
                                                style={{ width: `${segmentWidthPercent}%` }}
                                                className={`h-full border-r-2 border-slate-900 flex items-center justify-center relative p-1 transition-all ${colorClass}`}
                                                title={`Cut #${cutIdx + 1}: ${cutLen} mm (${(cutLen / 304.8).toFixed(1)} ft)`}
                                            >
                                                <span className="text-[10px] font-bold font-mono truncate px-0.5">
                                                    {cutLen} mm
                                                </span>
                                            </div>
                                        );
                                    })}

                                    {/* Remaining Off-cut Waste Segment */}
                                    {bar.wasteMm > 0 && (
                                        <div
                                            style={{ width: `${(bar.wasteMm / bar.lengthMm) * 100}%` }}
                                            className="h-full bg-rose-200/80 text-rose-800 border-l border-rose-400 flex items-center justify-center font-mono text-[9px] font-bold tracking-tight italic"
                                            title={`Remaining Off-Cut Waste: ${bar.wasteMm} mm`}
                                        >
                                            Waste: {bar.wasteMm}mm
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
