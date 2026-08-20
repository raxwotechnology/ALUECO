import React, { useState, useRef } from 'react';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Download, Lock, MoveLeft, MoveRight, ArrowLeftRight, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Alu2DInteractiveCanvas({
    appType = 'Sliding Door',
    width = 2400,
    height = 2100,
    trackSystem = '2-Track',
    panelCount = 2,
    panelArrangement = [],
    topSection = { enabled: true, height: 600, type: 'fixed' },
    selectedPanelIndex = null,
    onSelectPanel = () => {},
    customAddons = []
}) {
    const svgRef = useRef(null);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Sanitize dimension values
    const W = Math.max(300, Number(width) || 2400);
    const H_total = Math.max(400, Number(height) || 2100);
    const P = Math.max(1, Number(panelCount) || 1);
    
    const hasTop = topSection && topSection.enabled && Number(topSection.height) > 0 && Number(topSection.height) < H_total;
    const H_top = hasTop ? Math.min(H_total - 300, Math.max(200, Number(topSection.height))) : 0;
    const H_bottom = H_total - H_top;
    const topType = hasTop ? (topSection.type || 'fixed') : 'none';

    // SVG ViewBox & Aspect Scaling
    const containerW = 480;
    const containerH = 390;
    const marginX = 55;
    const marginY = 50;

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

    // Frame Profile Stroke Thickness (in CAD px)
    const outerThick = 7;
    const sashThick = 4.5;
    const panelFrameW = (frameW - outerThick * 2) / P;

    const isFixedProduct = appType.toLowerCase().includes('fixed');
    const isCasementProduct = appType.toLowerCase().includes('casement');
    const isAwningProduct = appType.toLowerCase().includes('awning') || appType.toLowerCase().includes('hung');
    const isLouverProduct = appType.toLowerCase().includes('louver');
    const isFoldingProduct = appType.toLowerCase().includes('fold');

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
                            <span className="text-amber-300 font-bold font-mono">[{appType.toUpperCase()}]</span> • {W} × {H_total} mm • {P} {P === 1 ? 'Panel' : 'Panels'} {hasTop ? `• Transom (${H_top}mm ${topType})` : ''}
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
                            <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.30" />
                                <stop offset="40%" stopColor="#0284c7" stopOpacity="0.12" />
                                <stop offset="70%" stopColor="#0369a1" stopOpacity="0.08" />
                                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
                            </linearGradient>
                            <linearGradient id="awningGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.15" />
                            </linearGradient>
                            <linearGradient id="aluFrame" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#475569" />
                                <stop offset="30%" stopColor="#94a3b8" />
                                <stop offset="70%" stopColor="#cbd5e1" />
                                <stop offset="100%" stopColor="#334155" />
                            </linearGradient>
                            <linearGradient id="transomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#64748b" />
                                <stop offset="50%" stopColor="#cbd5e1" />
                                <stop offset="100%" stopColor="#334155" />
                            </linearGradient>
                            <pattern id="cadGridBg" width="20" height="20" patternUnits="userSpaceOnUse">
                                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="2,2" />
                            </pattern>
                        </defs>

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

                        {/* 2. TOP FANLIGHT SECTION (IF ENABLED) */}
                        {hasTop && (
                            <g>
                                <rect
                                    x={frameX}
                                    y={frameY + topFrameH - outerThick / 2}
                                    width={frameW}
                                    height={outerThick}
                                    fill="url(#transomGrad)"
                                    stroke="#0f172a"
                                    strokeWidth="0.5"
                                />
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
                                    </g>
                                )}
                                {topType === 'awning' && (
                                    <g>
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
                                        <path
                                            d={`M ${frameX + outerThick + 6} ${frameY + topFrameH - 12} L ${frameX + frameW / 2} ${frameY + outerThick + 6} L ${frameX + frameW - outerThick - 6} ${frameY + topFrameH - 12}`}
                                            fill="none"
                                            stroke="#818cf8"
                                            strokeWidth="1.5"
                                            strokeDasharray="4,4"
                                        />
                                        <text
                                            x={frameX + frameW / 2}
                                            y={frameY + topFrameH / 2 + 3}
                                            fill="#c7d2fe"
                                            fontSize="9"
                                            textAnchor="middle"
                                            fontWeight="bold"
                                            opacity="0.9"
                                        >
                                            TOP AWNING (▲)
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
                                            fill="#0f172a"
                                            stroke="#38bdf8"
                                            strokeWidth="0.75"
                                        />
                                        {Array.from({ length: 4 }).map((_, lIdx) => {
                                            const slatY = frameY + outerThick + 8 + lIdx * ((topFrameH - outerThick * 2) / 4);
                                            return (
                                                <g key={lIdx}>
                                                    <line
                                                        x1={frameX + outerThick + 4}
                                                        y1={slatY}
                                                        x2={frameX + frameW - outerThick - 4}
                                                        y2={slatY + 5}
                                                        stroke="#38bdf8"
                                                        strokeWidth="2"
                                                        opacity="0.8"
                                                    />
                                                </g>
                                            );
                                        })}
                                        <text
                                            x={frameX + frameW / 2}
                                            y={frameY + topFrameH / 2}
                                            fill="#e0f2fe"
                                            fontSize="8"
                                            textAnchor="middle"
                                            fontWeight="black"
                                        >
                                            LOUVER
                                        </text>
                                    </g>
                                )}
                            </g>
                        )}

                        {/* 3. MAIN PANELS SYSTEM */}
                        {Array.from({ length: P }).map((_, idx) => {
                            const px = frameX + outerThick + idx * panelFrameW;
                            const py = frameY + topFrameH + (hasTop ? outerThick / 2 : outerThick);
                            const pw = panelFrameW;
                            const ph = bottomFrameH - outerThick * 1.5;

                            const arrObj = panelArrangement[idx] || {};
                            let action = arrObj.action;
                            if (!action) {
                                if (isFixedProduct) action = 'fixed';
                                else if (isCasementProduct) action = idx === 0 ? 'casement_left' : 'casement_right';
                                else if (isAwningProduct) action = 'awning_top';
                                else if (isLouverProduct) action = 'louver';
                                else if (isFoldingProduct) action = 'fold_left';
                                else action = (idx === 0 || idx === P - 1) ? 'slide_right' : 'fixed';
                            }

                            const isSelected = selectedPanelIndex === idx;
                            const isTrackOffset = idx % 2 === 1 && !isFixedProduct && !isCasementProduct;
                            const offsetPx = isTrackOffset ? 2 : 0;

                            return (
                                <g
                                    key={idx}
                                    onClick={() => onSelectPanel(idx)}
                                    className="cursor-pointer group"
                                >
                                    <rect
                                        x={px + 2 + offsetPx}
                                        y={py + 2}
                                        width={pw - 4}
                                        height={ph - 4}
                                        fill="url(#glassGradient)"
                                        stroke={isSelected ? '#10b981' : (isFixedProduct ? '#38bdf8' : '#94a3b8')}
                                        strokeWidth={isSelected ? sashThick + 2 : sashThick}
                                        rx="1"
                                        className="transition-all duration-150"
                                    />

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

                                    {/* 1. FIXED GLASS X-CROSS MARKINGS */}
                                    {action === 'fixed' && (
                                        <g stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="4,4" opacity="0.65">
                                            <line x1={px + 6} y1={py + 6} x2={px + pw - 6} y2={py + ph - 6} />
                                            <line x1={px + pw - 6} y1={py + 6} x2={px + 6} y2={py + ph - 6} />
                                        </g>
                                    )}

                                    {/* 2. CASEMENT OPENING SYMBOLS */}
                                    {action === 'casement_left' && (
                                        <g>
                                            <path
                                                d={`M ${px + pw - 6} ${py + ph / 2} L ${px + 6} ${py + 6} M ${px + pw - 6} ${py + ph / 2} L ${px + 6} ${py + ph - 6}`}
                                                fill="none"
                                                stroke="#38bdf8"
                                                strokeWidth="1.5"
                                                strokeDasharray="4,3"
                                            />
                                            <rect x={px + 2} y={py + 12} width="4" height="10" fill="#94a3b8" rx="1" />
                                            <rect x={px + 2} y={py + ph - 22} width="4" height="10" fill="#94a3b8" rx="1" />
                                            <rect x={px + pw - 7} y={py + ph / 2 - 8} width="4" height="16" fill="#f59e0b" rx="1" />
                                        </g>
                                    )}

                                    {action === 'casement_right' && (
                                        <g>
                                            <path
                                                d={`M ${px + 6} ${py + ph / 2} L ${px + pw - 6} ${py + 6} M ${px + 6} ${py + ph / 2} L ${px + pw - 6} ${py + ph - 6}`}
                                                fill="none"
                                                stroke="#38bdf8"
                                                strokeWidth="1.5"
                                                strokeDasharray="4,3"
                                            />
                                            <rect x={px + pw - 6} y={py + 12} width="4" height="10" fill="#94a3b8" rx="1" />
                                            <rect x={px + pw - 6} y={py + ph - 22} width="4" height="10" fill="#94a3b8" rx="1" />
                                            <rect x={px + 3} y={py + ph / 2 - 8} width="4" height="16" fill="#f59e0b" rx="1" />
                                        </g>
                                    )}

                                    {/* 3. AWNING OPENING SYMBOL */}
                                    {action === 'awning_top' && (
                                        <g>
                                            <path
                                                d={`M ${px + pw / 2} ${py + ph - 6} L ${px + 6} ${py + 6} M ${px + pw / 2} ${py + ph - 6} L ${px + pw - 6} ${py + 6}`}
                                                fill="none"
                                                stroke="#818cf8"
                                                strokeWidth="1.5"
                                                strokeDasharray="4,3"
                                            />
                                            <rect x={px + pw / 2 - 6} y={py + ph - 9} width="12" height="4" fill="#f59e0b" rx="1" />
                                        </g>
                                    )}

                                    {/* 4. LOUVER SLATS */}
                                    {action === 'louver' && (
                                        <g>
                                            {Array.from({ length: 6 }).map((_, lIdx) => {
                                                const slatY = py + 12 + lIdx * ((ph - 24) / 6);
                                                return (
                                                    <line
                                                        key={lIdx}
                                                        x1={px + 6}
                                                        y1={slatY}
                                                        x2={px + pw - 6}
                                                        y2={slatY + 6}
                                                        stroke="#38bdf8"
                                                        strokeWidth="2"
                                                        opacity="0.85"
                                                    />
                                                );
                                            })}
                                        </g>
                                    )}

                                    {/* 5. SLIDING ARROWS */}
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
                                        {action === 'fold_left' && (
                                            <g stroke="#f59e0b" strokeWidth="1.75" fill="none">
                                                <circle r="14" fill="#0f172a" fillOpacity="0.8" stroke="#d97706" strokeWidth="1" />
                                                <path d="M 5 -4 L -2 0 L 5 4 M -2 -4 L -7 0 L -2 4" />
                                            </g>
                                        )}
                                    </g>

                                    {/* Panel Index Label */}
                                    <g transform={`translate(${px + pw / 2}, ${py + ph - 14})`}>
                                        <rect
                                            x="-42"
                                            y="-8"
                                            width="84"
                                            height="15"
                                            fill="#0f172a"
                                            fillOpacity="0.9"
                                            stroke={isSelected ? '#10b981' : '#38bdf8'}
                                            strokeWidth="0.75"
                                            rx="4"
                                        />
                                        <text
                                            x="0"
                                            y="2.5"
                                            fill={isSelected ? '#10b981' : '#38bdf8'}
                                            fontSize="8"
                                            textAnchor="middle"
                                            fontWeight="900"
                                            className="font-mono tracking-wider uppercase"
                                        >
                                            {P === 1 ? '1-PANEL' : `P${idx + 1}`} ({action.replace('slide_', '').replace('casement_', 'CASE-').replace('_', ' ')})
                                        </text>
                                    </g>

                                    {/* Roller Wheels */}
                                    {(action === 'slide_left' || action === 'slide_right' || action === 'slide_both') && (
                                        <g>
                                            <circle cx={px + 15} cy={py + ph - 4} r="3" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
                                            <circle cx={px + pw - 15} cy={py + ph - 4} r="3" fill="#cbd5e1" stroke="#334155" strokeWidth="1" />
                                        </g>
                                    )}
                                </g>
                            );
                        })}

                        {/* 4. TECHNICAL CAD DIMENSION LINES & ANNOTATIONS */}
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

                        {/* Active Custom Add-on Badges on 2D Visual Canvas */}
                        {Array.isArray(customAddons) && customAddons.length > 0 && (
                            <g transform={`translate(${frameX + 6}, ${frameY + 6})`}>
                                {customAddons.map((addon, aIdx) => (
                                    <g key={aIdx} transform={`translate(0, ${aIdx * 16})`}>
                                        <rect
                                            x="0"
                                            y="0"
                                            width={Math.min(180, (addon.name || '').length * 6 + 16)}
                                            height="13"
                                            fill="#0f172a"
                                            fillOpacity="0.85"
                                            stroke="#10b981"
                                            strokeWidth="0.75"
                                            rx="3"
                                        />
                                        <text
                                            x="5"
                                            y="9"
                                            fill="#10b981"
                                            fontSize="7.5"
                                            fontWeight="bold"
                                            className="font-mono uppercase"
                                        >
                                            + {addon.name}
                                        </text>
                                    </g>
                                ))}
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
