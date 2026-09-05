import React from 'react';

export default function Alu2DCadPreview({ 
    type = 'Sliding Door', 
    configuration = '2 Panel - 2 Track', 
    width = 1800, 
    height = 2100,
    profileBOM = []
}) {
    // Parse panel count from configuration or type
    const parsePanelCount = (configStr, typeStr) => {
        if (!configStr) configStr = '';
        const match = configStr.match(/(\d+)\s*panel/i);
        if (match) return parseInt(match[1]);
        if (typeStr?.toLowerCase().includes('casement')) return 1;
        if (typeStr?.toLowerCase().includes('fixed')) return 1;
        return 2; // Default 2 panels
    };

    const panelCount = Math.max(1, parsePanelCount(configuration, type));
    const isSliding = type?.toLowerCase().includes('sliding');
    const isCasement = type?.toLowerCase().includes('casement');
    const isSwing = type?.toLowerCase().includes('swing');
    const isLouver = type?.toLowerCase().includes('louver');
    const isFixed = type?.toLowerCase().includes('fixed');

    // Canvas SVG dimensions
    const svgW = 340;
    const svgH = 260;
    const margin = 35;

    const frameX = margin;
    const frameY = margin;
    const frameW = svgW - margin * 2;
    const frameH = svgH - margin * 2 - 15;

    // Outer frame profile thickness
    const frameThick = 10;
    const sashThick = 6;

    const innerW = frameW - frameThick * 2;
    const innerH = frameH - frameThick * 2;
    const panelWidth = innerW / panelCount;

    return (
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-slate-100 font-mono text-xs select-none">
            {/* Header */}
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">2D CAD Elevation Generator</span>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">{type || 'Standard'} ({configuration || '1 Panel'})</span>
            </div>

            {/* SVG Drawing Canvas */}
            <div className="flex justify-center items-center bg-slate-900/60 rounded-xl p-2 border border-slate-800/80 relative">
                <svg width={svgW} height={svgH} className="overflow-visible">
                    <defs>
                        {/* Glass Gradient */}
                        <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
                        </linearGradient>

                        {/* Aluminium Profile Metallic Gradient */}
                        <linearGradient id="aluFrameGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#64748b" />
                            <stop offset="50%" stopColor="#94a3b8" />
                            <stop offset="100%" stopColor="#475569" />
                        </linearGradient>

                        {/* Grid Pattern */}
                        <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" strokeDasharray="1,3" />
                        </pattern>
                    </defs>

                    {/* Technical Grid */}
                    <rect x="0" y="0" width={svgW} height={svgH} fill="url(#cadGrid)" opacity="0.4" />

                    {/* Outer Frame (Mitred Outer Section) */}
                    <rect
                        x={frameX}
                        y={frameY}
                        width={frameW}
                        height={frameH}
                        fill="none"
                        stroke="url(#aluFrameGrad)"
                        strokeWidth={frameThick}
                        rx="2"
                    />

                    {/* Outer Frame Inner Border */}
                    <rect
                        x={frameX + frameThick / 2}
                        y={frameY + frameThick / 2}
                        width={frameW - frameThick}
                        height={frameH - frameThick}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="1"
                    />

                    {/* Panel Glass & Sashes */}
                    {Array.from({ length: panelCount }).map((_, idx) => {
                        const px = frameX + frameThick + idx * panelWidth;
                        const py = frameY + frameThick;
                        const pw = panelWidth;
                        const ph = innerH;

                        return (
                            <g key={idx}>
                                {/* Sash Aluminium Border */}
                                <rect
                                    x={px + 2}
                                    y={py + 2}
                                    width={pw - 4}
                                    height={ph - 4}
                                    fill="url(#glassGrad)"
                                    stroke="#94a3b8"
                                    strokeWidth={sashThick}
                                    rx="1"
                                />

                                {/* Glass Reflection Glare */}
                                <line
                                    x1={px + 12}
                                    y1={py + 15}
                                    x2={px + pw - 20}
                                    y2={py + ph - 25}
                                    stroke="#ffffff"
                                    strokeWidth="1"
                                    strokeOpacity="0.25"
                                    strokeDasharray="4,8"
                                />

                                {/* Louvre Slats if Louver Window */}
                                {isLouver && (
                                    Array.from({ length: 6 }).map((_, lIdx) => (
                                        <line
                                            key={lIdx}
                                            x1={px + 6}
                                            y1={py + 15 + lIdx * ((ph - 30) / 5)}
                                            x2={px + pw - 6}
                                            y2={py + 20 + lIdx * ((ph - 30) / 5)}
                                            stroke="#cbd5e1"
                                            strokeWidth="2"
                                        />
                                    ))
                                )}

                                {/* Opening Symbol Arrows */}
                                {isSliding && (
                                    <g stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.8">
                                        {idx % 2 === 0 ? (
                                            <path d={`M ${px + pw / 2 - 10} ${py + ph / 2} L ${px + pw / 2 + 10} ${py + ph / 2} M ${px + pw / 2 + 5} ${py + ph / 2 - 5} L ${px + pw / 2 + 10} ${py + ph / 2} L ${px + pw / 2 + 5} ${py + ph / 2 + 5}`} />
                                        ) : (
                                            <path d={`M ${px + pw / 2 + 10} ${py + ph / 2} L ${px + pw / 2 - 10} ${py + ph / 2} M ${px + pw / 2 - 5} ${py + ph / 2 - 5} L ${px + pw / 2 - 10} ${py + ph / 2} L ${px + pw / 2 - 5} ${py + ph / 2 + 5}`} />
                                        )}
                                    </g>
                                )}

                                {isCasement && (
                                    <path
                                        d={`M ${px + 6} ${py + 6} L ${px + pw - 6} ${py + ph / 2} L ${px + 6} ${py + ph - 6}`}
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth="1"
                                        strokeDasharray="3,3"
                                        opacity="0.8"
                                    />
                                )}

                                {isSwing && (
                                    <path
                                        d={`M ${px + pw - 6} ${py + 6} L ${px + 6} ${py + ph / 2} L ${px + pw - 6} ${py + ph - 6}`}
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth="1"
                                        strokeDasharray="3,3"
                                        opacity="0.8"
                                    />
                                )}

                                {/* Handle / Latch representation */}
                                {(isSliding || isCasement || isSwing) && (
                                    <rect
                                        x={idx % 2 === 0 ? px + pw - 10 : px + 6}
                                        y={py + ph / 2 - 12}
                                        width="4"
                                        height="24"
                                        fill="#e2e8f0"
                                        rx="1"
                                    />
                                )}
                            </g>
                        );
                    })}

                    {/* Width Dimension Line (Bottom) */}
                    <g stroke="#38bdf8" strokeWidth="1" opacity="0.85">
                        <line x1={frameX} y1={frameY + frameH + 12} x2={frameX + frameW} y2={frameY + frameH + 12} />
                        <line x1={frameX} y1={frameY + frameH + 7} x2={frameX} y2={frameY + frameH + 17} />
                        <line x1={frameX + frameW} y1={frameY + frameH + 7} x2={frameX + frameW} y2={frameY + frameH + 17} />
                    </g>
                    <text x={frameX + frameW / 2} y={frameY + frameH + 24} fill="#38bdf8" fontSize="9" textAnchor="middle" fontWeight="bold">
                        W: {width} mm
                    </text>

                    {/* Height Dimension Line (Right) */}
                    <g stroke="#38bdf8" strokeWidth="1" opacity="0.85">
                        <line x1={frameX + frameW + 12} y1={frameY} x2={frameX + frameW + 12} y2={frameY + frameH} />
                        <line x1={frameX + frameW + 7} y1={frameY} x2={frameX + frameW + 17} y2={frameY} />
                        <line x1={frameX + frameW + 7} y1={frameY + frameH} x2={frameX + frameW + 17} y2={frameY + frameH} />
                    </g>
                    <text
                        x={frameX + frameW + 24}
                        y={frameY + frameH / 2}
                        fill="#38bdf8"
                        fontSize="9"
                        textAnchor="middle"
                        fontWeight="bold"
                        transform={`rotate(90, ${frameX + frameW + 24}, ${frameY + frameH / 2})`}
                    >
                        H: {height} mm
                    </text>
                </svg>
            </div>

            {/* Profile BOM Cuts Auto Summary */}
            {profileBOM && profileBOM.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-800/80">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Generated BOM Cut Specs ({profileBOM.length} Profiles):</p>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        {profileBOM.slice(0, 4).map((p, i) => (
                            <div key={i} className="bg-slate-900 p-1.5 rounded border border-slate-800 flex justify-between">
                                <span className="font-bold text-indigo-400">{p.profileCode || 'Prof'}</span>
                                <span className="text-slate-300 font-mono">Qty: {p.quantityFormula || '1'} | L: {p.lengthFormula || 'H'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
