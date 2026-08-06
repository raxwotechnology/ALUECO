import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Download, Lock, MoveLeft, MoveRight, ArrowLeftRight, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Alu2DInteractiveCanvas({
    width = 2400,
    height = 2100,
    trackSystem = '2-Track',
    panelCount = 2,
    panelArrangement = [],
    topSection = { enabled: true, height: 600, type: 'fixed' },
    selectedPanelIndex = null,
    onSelectPanel = () => {}
}) {
    const svgRef = useRef(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Sanitize dimension values
    const W = Math.max(300, Number(width) || 2400);
    const H_total = Math.max(400, Number(height) || 2100);
    const P = Math.max(1, Number(panelCount) || 2);
    
    const hasTop = topSection && topSection.enabled && Number(topSection.height) > 0 && Number(topSection.height) < H_total;
    const H_top = hasTop ? Math.min(H_total - 300, Math.max(200, Number(topSection.height))) : 0;
    const H_bottom = H_total - H_top;
    const topType = hasTop ? (topSection.type || 'fixed') : 'none';

    // SVG ViewBox & Aspect Scaling
    const containerW = 460;
    const containerH = 380;
    const marginX = 45;
    const marginY = 45;

    const drawableW = containerW - marginX * 2;
    const drawableH = containerH - marginY * 2;

    // Scale maintaining aspect ratio
    const scale = Math.min(drawableW / W, drawableH / H_total);
    const frameW = W * scale;
    const frameH = H_total * scale;

    const frameX = marginX + (drawableW - frameW) / 2;
    const frameY = marginY + (drawableH - frameH) / 2;

    const topRatio = hasTop ? H_top / H_total : 0;
    const topFrameH = frameH * topRatio;
    const bottomFrameH = frameH - topFrameH;

    const panelFrameW = frameW / P;
    const outerThick = Math.max(6, Math.min(12, 80 * scale));
    const sashThick = Math.max(4, Math.min(8, 50 * scale));

    // Handle SVG Export / Download
    const handleDownloadSVG = () => {
        if (!svgRef.current) return;
        const svgData = new XMLSerializer().serializeToString(svgRef.current);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `ALUECO_2D_CAD_${W}x${H_total}mm_${P}Panel.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        toast.success('Downloaded 2D CAD SVG Drawing!');
    };

    return (
        <div className={`bg-slate-950 rounded-2xl border border-slate-800 text-slate-100 shadow-xl flex flex-col justify-between overflow-hidden transition-all ${isFullscreen ? 'fixed inset-4 z-50 p-6' : 'p-4'}`}>
            {/* Canvas Control Header */}
            <div className="flex flex-wrap justify-between items-center pb-3 mb-3 border-b border-slate-800/80 gap-2 select-none">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                    <div>
                        <h4 className="font-extrabold text-emerald-400 uppercase tracking-wider text-xs flex items-center gap-1.5">
                            <Eye size={14} /> 2D Interactive CAD Canvas
                        </h4>
                        <p className="text-[10px] text-slate-400 font-sans">
                            {W} × {H_total} mm • {trackSystem} • {P} Panels {hasTop ? `• Transom (${H_top}mm ${topType})` : ''}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                        onClick={() => setZoomLevel(prev => Math.min(1.6, prev + 0.15))}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition"
                        title="Zoom In"
                    >
                        <ZoomIn size={14} />
                    </button>
                    <button
                        onClick={() => setZoomLevel(prev => Math.max(0.7, prev - 0.15))}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition"
                        title="Zoom Out"
                    >
                        <ZoomOut size={14} />
                    </button>
                    <button
                        onClick={() => setZoomLevel(1)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition"
                        title="Reset Zoom"
                    >
                        <RotateCcw size={14} />
                    </button>
                    <div className="h-4 w-px bg-slate-800 mx-0.5"></div>
                    <button
                        onClick={handleDownloadSVG}
                        className="p-1.5 rounded-lg hover:bg-emerald-900/40 text-emerald-400 transition"
                        title="Download SVG"
                    >
                        <Download size={14} />
                    </button>
                    <button
                        onClick={() => setIsFullscreen(prev => !prev)}
                        className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition"
                        title="Toggle Fullscreen"
                    >
                        <Maximize2 size={14} />
                    </button>
                </div>
            </div>

            {/* SVG Interactive Visual Canvas */}
            <div className="flex-1 flex justify-center items-center bg-slate-900/80 rounded-xl p-3 border border-slate-800/80 relative overflow-hidden select-none min-h-[300px]">
                <div
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                    className="transition-transform duration-200"
                >
                    <svg
                        ref={svgRef}
                        width={containerW}
                        height={containerH}
                        viewBox={`0 0 ${containerW} ${containerH}`}
                        className="overflow-visible"
                    >
                        <defs>
                            {/* Glass Surface Gradient */}
                            <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.30" />
                                <stop offset="40%" stopColor="#0284c7" stopOpacity="0.12" />
                                <stop offset="70%" stopColor="#0369a1" stopOpacity="0.08" />
                                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
                            </linearGradient>

                            {/* Awning Glass Tint */}
                            <linearGradient id="awningGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.15" />
                            </linearGradient>

                            {/* Aluminium Metallic Gradient */}
                            <linearGradient id="aluFrame" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#475569" />
                                <stop offset="30%" stopColor="#94a3b8" />
                                <stop offset="70%" stopColor="#cbd5e1" />
                                <stop offset="100%" stopColor="#334155" />
                            </linearGradient>

                            {/* Transom Bar Gradient */}
                            <linearGradient id="transomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#64748b" />
                                <stop offset="50%" stopColor="#cbd5e1" />
                                <stop offset="100%" stopColor="#334155" />
                            </linearGradient>

                            {/* Technical Grid Pattern */}
                            <pattern id="cadGridBg" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                            </pattern>
                        </defs>

                        {/* Background Grid */}
                        <rect x="0" y="0" width={containerW} height={containerH} fill="url(#cadGridBg)" />

                        {/* 1. OUTER ALUMINIUM FRAME */}
                        <rect
                            x={frameX}
                            y={frameY}
                            width={frameW}
                            height={frameH}
                            fill="none"
                            stroke="url(#aluFrame)"
                            strokeWidth={outerThick}
                            rx="2"
                        />
                        <rect
                            x={frameX + outerThick / 2}
                            y={frameY + outerThick / 2}
                            width={frameW - outerThick}
                            height={frameH - outerThick}
                            fill="none"
                            stroke="#0f172a"
                            strokeWidth="1"
                        />

                        {/* 2. TOP FANLIGHT SECTION (IF ENABLED) */}
                        {hasTop && (
                            <g>
                                {/* Transom Bar Separator */}
                                <rect
                                    x={frameX}
                                    y={frameY + topFrameH - outerThick / 2}
                                    width={frameW}
                                    height={outerThick}
                                    fill="url(#transomGrad)"
                                    stroke="#0f172a"
                                    strokeWidth="0.5"
                                />

                                {/* Top Section Fill */}
                                {topType === 'fixed' && (
                                    <g>
                                        <rect
                                            x={frameX + outerThick}
                                            y={frameY + outerThick}
                                            width={frameW - outerThick * 2}
                                            height={topFrameH - outerThick * 1.5}
                                            fill="url(#glassGradient)"
                                            stroke="#38bdf8"
                                            strokeWidth="0.75"
                                        />
                                        {/* Standard Architectural "X" Cross Markings for Fixed Glass */}
                                        <line
                                            x1={frameX + outerThick + 4}
                                            y1={frameY + outerThick + 4}
                                            x2={frameX + frameW - outerThick - 4}
                                            y2={frameY + topFrameH - outerThick * 1.5 - 4}
                                            stroke="#38bdf8"
                                            strokeWidth="1"
                                            strokeDasharray="4,4"
                                            opacity="0.75"
                                        />
                                        <line
                                            x1={frameX + frameW - outerThick - 4}
                                            y1={frameY + outerThick + 4}
                                            x2={frameX + outerThick + 4}
                                            y2={frameY + topFrameH - outerThick * 1.5 - 4}
                                            stroke="#38bdf8"
                                            strokeWidth="1"
                                            strokeDasharray="4,4"
                                            opacity="0.75"
                                        />
                                        <text
                                            x={frameX + frameW / 2}
                                            y={frameY + topFrameH / 2 + 3}
                                            fill="#38bdf8"
                                            fontSize="9"
                                            textAnchor="middle"
                                            fontWeight="bold"
                                            opacity="0.85"
                                        >
                                            TOP FIXED (X)
                                        </text>
                                    </g>
                                )}

                                {topType === 'awning' && (
                                    <g>
                                        {/* Awning Sash Frame */}
                                        <rect
                                            x={frameX + outerThick + 3}
                                            y={frameY + outerThick + 3}
                                            width={frameW - outerThick * 2 - 6}
                                            height={topFrameH - outerThick * 1.5 - 6}
                                            fill="url(#awningGrad)"
                                            stroke="#818cf8"
                                            strokeWidth={sashThick}
                                            rx="1"
                                        />
                                        {/* Triangular opening vector lines (Top hinged -> bottom latch) */}
                                        <path
                                            d={`M ${frameX + outerThick + 8} ${frameY + outerThick + 8} L ${frameX + frameW / 2} ${frameY + topFrameH - 8} L ${frameX + frameW - outerThick - 8} ${frameY + outerThick + 8}`}
                                            fill="none"
                                            stroke="#a5b4fc"
                                            strokeWidth="1.2"
                                            strokeDasharray="4,4"
                                        />
                                        {/* Handle Icon */}
                                        <rect
                                            x={frameX + frameW / 2 - 8}
                                            y={frameY + topFrameH - 14}
                                            width="16"
                                            height="4"
                                            fill="#e2e8f0"
                                            rx="1"
                                        />
                                        <text
                                            x={frameX + frameW / 2}
                                            y={frameY + topFrameH / 2}
                                            fill="#c7d2fe"
                                            fontSize="8"
                                            textAnchor="middle"
                                            fontWeight="bold"
                                        >
                                            TOP-HUNG AWNING
                                        </text>
                                    </g>
                                )}

                                {topType === 'louver' && (
                                    <g>
                                        <rect
                                            x={frameX + outerThick}
                                            y={frameY + outerThick}
                                            width={frameW - outerThick * 2}
                                            height={topFrameH - outerThick * 1.5}
                                            fill="#0284c7"
                                            fillOpacity="0.05"
                                            stroke="#38bdf8"
                                            strokeWidth="0.5"
                                        />
                                        {/* Louver horizontal blade slats */}
                                        {Array.from({ length: Math.max(3, Math.floor(topFrameH / 14)) }).map((_, lIdx, arr) => {
                                            const sy = frameY + outerThick + 6 + lIdx * ((topFrameH - outerThick * 2 - 12) / (arr.length - 1 || 1));
                                            return (
                                                <g key={lIdx}>
                                                    <line
                                                        x1={frameX + outerThick + 4}
                                                        y1={sy}
                                                        x2={frameX + frameW - outerThick - 4}
                                                        y2={sy + 3}
                                                        stroke="#cbd5e1"
                                                        strokeWidth="2.5"
                                                    />
                                                    {/* Side louver clips */}
                                                    <rect x={frameX + outerThick + 2} y={sy - 2} width="4" height="6" fill="#94a3b8" rx="0.5" />
                                                    <rect x={frameX + frameW - outerThick - 6} y={sy - 2} width="4" height="6" fill="#94a3b8" rx="0.5" />
                                                </g>
                                            );
                                        })}
                                        <text
                                            x={frameX + frameW / 2}
                                            y={frameY + topFrameH / 2 + 3}
                                            fill="#e0f2fe"
                                            fontSize="8"
                                            textAnchor="middle"
                                            fontWeight="black"
                                            opacity="0.9"
                                        >
                                            LOUVER BLADES
                                        </text>
                                    </g>
                                )}
                            </g>
                        )}

                        {/* 3. BOTTOM SLIDING PANELS SYSTEM */}
                        {Array.from({ length: P }).map((_, idx) => {
                            const px = frameX + outerThick + idx * panelFrameW;
                            const py = frameY + topFrameH + (hasTop ? outerThick / 2 : outerThick);
                            const pw = panelFrameW;
                            const ph = bottomFrameH - outerThick * 1.5;

                            const arrObj = panelArrangement[idx] || {};
                            const action = arrObj.action || (idx === 0 || idx === P - 1 ? 'slide_right' : 'fixed');
                            const isSelected = selectedPanelIndex === idx;

                            // Multi-track depth offset rendering (Track 1 vs Track 2 offset)
                            const isTrackOffset = idx % 2 === 1;
                            const offsetPx = isTrackOffset ? 2 : -1;

                            return (
                                <g
                                    key={idx}
                                    onClick={() => onSelectPanel(idx)}
                                    className="cursor-pointer group"
                                >
                                    {/* Panel Container / Sash Frame */}
                                    <rect
                                        x={px + 2 + offsetPx}
                                        y={py + 2}
                                        width={pw - 4}
                                        height={ph - 4}
                                        fill="url(#glassGradient)"
                                        stroke={isSelected ? '#10b981' : '#94a3b8'}
                                        strokeWidth={isSelected ? sashThick + 2 : sashThick}
                                        rx="1"
                                        className="transition-all duration-150"
                                    />

                                    {/* Selected Panel Highlight Ring */}
                                    {isSelected && (
                                        <rect
                                            x={px + 1}
                                            y={py + 1}
                                            width={pw - 2}
                                            height={ph - 2}
                                            fill="none"
                                            stroke="#10b981"
                                            strokeWidth="2"
                                            strokeDasharray="4,4"
                                        />
                                    )}

                                    {/* Architectural "X" Cross Markings for Fixed Panel */}
                                    {action === 'fixed' && (
                                        <g stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="4,4" opacity="0.65">
                                            <line x1={px + 6} y1={py + 6} x2={px + pw - 6} y2={py + ph - 6} />
                                            <line x1={px + pw - 6} y1={py + 6} x2={px + 6} y2={py + ph - 6} />
                                        </g>
                                    )}

                                    {/* Panel Badge & Arrow Indicator */}
                                    <g transform={`translate(${px + pw / 2}, ${py + ph / 2})`}>
                                        {action === 'fixed' && (
                                            <g className="text-slate-400">
                                                <circle r="12" fill="#0f172a" fillOpacity="0.75" stroke="#475569" strokeWidth="1" />
                                                <path d="M-4 -2 L4 -2 L4 4 L-4 4 Z M-2 -2 L-2 -5 C-2 -7 2 -7 2 -5 L2 -2" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
                                            </g>
                                        )}

                                        {action === 'slide_left' && (
                                            <g stroke="#38bdf8" strokeWidth="2" fill="none">
                                                <circle r="14" fill="#0f172a" fillOpacity="0.8" stroke="#0284c7" strokeWidth="1" />
                                                <path d="M 6 0 L -6 0 M -2 -5 L -7 0 L -2 5" />
                                            </g>
                                        )}

                                        {action === 'slide_right' && (
                                            <g stroke="#38bdf8" strokeWidth="2" fill="none">
                                                <circle r="14" fill="#0f172a" fillOpacity="0.8" stroke="#0284c7" strokeWidth="1" />
                                                <path d="M -6 0 L 6 0 M 2 -5 L 7 0 L 2 5" />
                                            </g>
                                        )}

                                        {action === 'slide_both' && (
                                            <g stroke="#38bdf8" strokeWidth="2" fill="none">
                                                <circle r="14" fill="#0f172a" fillOpacity="0.8" stroke="#0284c7" strokeWidth="1" />
                                                <path d="M -7 0 L 7 0 M -3 -4 L -7 0 L -3 4 M 3 -4 L 7 0 L 3 4" />
                                            </g>
                                        )}
                                    </g>

                                    {/* Panel Index Label */}
                                    <text
                                        x={px + pw / 2}
                                        y={py + ph - 10}
                                        fill="#94a3b8"
                                        fontSize="9"
                                        textAnchor="middle"
                                        fontWeight="bold"
                                        className="font-mono"
                                    >
                                        P{idx + 1} ({action === 'fixed' ? 'FIXED' : 'SLIDE'})
                                    </text>

                                    {/* Roller Wheel Representation at Bottom */}
                                    {action !== 'fixed' && (
                                        <g>
                                            <circle cx={px + 15} cy={py + ph - 4} r="3" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
                                            <circle cx={px + pw - 15} cy={py + ph - 4} r="3" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
                                        </g>
                                    )}
                                </g>
                            );
                        })}

                        {/* 4. TECHNICAL CAD DIMENSION LINES & ANNOTATIONS */}
                        
                        {/* Width Dimension Line (Bottom) */}
                        <g stroke="#38bdf8" strokeWidth="1" opacity="0.85">
                            <line x1={frameX} y1={frameY + frameH + 14} x2={frameX + frameW} y2={frameY + frameH + 14} />
                            <line x1={frameX} y1={frameY + frameH + 9} x2={frameX} y2={frameY + frameH + 19} />
                            <line x1={frameX + frameW} y1={frameY + frameH + 9} x2={frameX + frameW} y2={frameY + frameH + 19} />
                            {/* Width Arrowheads */}
                            <path d={`M ${frameX + 6} ${frameY + frameH + 11} L ${frameX} ${frameY + frameH + 14} L ${frameX + 6} ${frameY + frameH + 17}`} fill="#38bdf8" />
                            <path d={`M ${frameX + frameW - 6} ${frameY + frameH + 11} L ${frameX + frameW} ${frameY + frameH + 14} L ${frameX + frameW - 6} ${frameY + frameH + 17}`} fill="#38bdf8" />
                        </g>
                        <text x={frameX + frameW / 2} y={frameY + frameH + 28} fill="#38bdf8" fontSize="10" textAnchor="middle" fontWeight="bold" className="font-mono">
                            W: {W} mm
                        </text>

                        {/* Total Height Dimension Line (Right Side) */}
                        <g stroke="#38bdf8" strokeWidth="1" opacity="0.85">
                            <line x1={frameX + frameW + 14} y1={frameY} x2={frameX + frameW + 14} y2={frameY + frameH} />
                            <line x1={frameX + frameW + 9} y1={frameY} x2={frameX + frameW + 19} y2={frameY} />
                            <line x1={frameX + frameW + 9} y1={frameY + frameH} x2={frameX + frameW + 19} y2={frameY + frameH} />
                        </g>
                        <text
                            x={frameX + frameW + 28}
                            y={frameY + frameH / 2}
                            fill="#38bdf8"
                            fontSize="10"
                            textAnchor="middle"
                            fontWeight="bold"
                            className="font-mono"
                            transform={`rotate(90, ${frameX + frameW + 28}, ${frameY + frameH / 2})`}
                        >
                            H: {H_total} mm
                        </text>

                        {/* Top / Bottom Height Split Dimension Lines (Left Side, if Top Enabled) */}
                        {hasTop && (
                            <g stroke="#a5b4fc" strokeWidth="1" opacity="0.85">
                                {/* Top Height Split */}
                                <line x1={frameX - 14} y1={frameY} x2={frameX - 14} y2={frameY + topFrameH} />
                                <line x1={frameX - 19} y1={frameY} x2={frameX - 9} y2={frameY} />
                                <line x1={frameX - 19} y1={frameY + topFrameH} x2={frameX - 9} y2={frameY + topFrameH} />
                                <text
                                    x={frameX - 26}
                                    y={frameY + topFrameH / 2}
                                    fill="#a5b4fc"
                                    fontSize="8"
                                    textAnchor="middle"
                                    fontWeight="bold"
                                    className="font-mono"
                                    transform={`rotate(-90, ${frameX - 26}, ${frameY + topFrameH / 2})`}
                                >
                                    Top: {H_top}mm
                                </text>

                                {/* Bottom Height Split */}
                                <line x1={frameX - 14} y1={frameY + topFrameH} x2={frameX - 14} y2={frameY + frameH} />
                                <line x1={frameX - 19} y1={frameY + frameH} x2={frameX - 9} y2={frameY + frameH} />
                                <text
                                    x={frameX - 26}
                                    y={frameY + topFrameH + bottomFrameH / 2}
                                    fill="#a5b4fc"
                                    fontSize="8"
                                    textAnchor="middle"
                                    fontWeight="bold"
                                    className="font-mono"
                                    transform={`rotate(-90, ${frameX - 26}, ${frameY + topFrameH + bottomFrameH / 2})`}
                                >
                                    Bot: {H_bottom}mm
                                </text>
                            </g>
                        )}
                    </svg>
                </div>
            </div>

            {/* Bottom Panel Selection Toolbar */}
            <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap justify-between items-center text-[10px] text-slate-400 gap-2">
                <span>Click any panel in the canvas to select and change its fixed/sliding configuration.</span>
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400"></span> Sliding Panel</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500"></span> Fixed Panel</span>
                    {hasTop && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400"></span> Top Section</span>}
                </div>
            </div>
        </div>
    );
}
