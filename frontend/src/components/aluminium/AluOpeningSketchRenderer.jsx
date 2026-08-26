import React from 'react';

/**
 * High-Fidelity 2D CAD Elevation Sketch Renderer for Aluminium Openings
 * Renders the exact architectural elevation drawing for Sliding Doors/Windows,
 * Casements, Awnings, Fixed Partitions, Louvers, Bi-folds, and Custom Openings.
 */
export default function AluOpeningSketchRenderer({
    item = {},
    type = '',
    configuration = '',
    width = 2400,
    height = 2100,
    panelArrangement = null,
    topSection = null,
    trackSystem = '',
    sketchImage = '',
    className = 'w-28 h-20'
}) {
    // If a pre-rendered or uploaded sketch image exists, render it directly
    const directImage = item?.sketchImage || sketchImage;
    if (directImage) {
        return (
            <div className={`${className} bg-slate-950 rounded-lg p-0.5 border border-slate-700/80 shadow-xs flex items-center justify-center overflow-hidden`}>
                <img src={directImage} alt="Opening Elevation Sketch" className="w-full h-full object-contain rounded" />
            </div>
        );
    }

    // Extract parameters from item or props
    const appType = item?.applicationType || type || 'Sliding Door';
    const configStr = item?.configuration || configuration || '2 Panel';
    const W = Math.max(300, Number(item?.width || width || 2400));
    const H_total = Math.max(400, Number(item?.height || height || 2100));
    
    // Parse panel count
    let P = 1;
    const panelMatch = configStr.match(/(\d+)\s*panel/i);
    if (panelMatch) {
        P = parseInt(panelMatch[1]);
    } else if (item?.panelArrangement && item.panelArrangement.length > 0) {
        P = item.panelArrangement.length;
    } else if (appType.toLowerCase().includes('sliding')) {
        P = 2;
    } else if (appType.toLowerCase().includes('folding') || appType.toLowerCase().includes('bi-fold')) {
        P = 3;
    } else {
        P = 1;
    }
    P = Math.max(1, Math.min(8, P));

    // Top Transom Section
    const topSec = item?.topSection || topSection;
    const hasTop = topSec && topSec.enabled && Number(topSec.height) > 0 && Number(topSec.height) < H_total;
    const H_top = hasTop ? Math.min(H_total - 300, Math.max(200, Number(topSec.height))) : 0;
    const H_bottom = H_total - H_top;
    const topType = hasTop ? (topSec.type || 'fixed') : 'none';

    // Panel actions deduction
    const actions = [];
    const itemPanels = item?.panelArrangement || panelArrangement;
    if (itemPanels && itemPanels.length >= P) {
        for (let i = 0; i < P; i++) {
            actions.push(itemPanels[i]?.action || 'slide_right');
        }
    } else {
        // Deduce default actions
        const isSliding = appType.toLowerCase().includes('sliding');
        const isCasement = appType.toLowerCase().includes('casement');
        const isAwning = appType.toLowerCase().includes('awning') || appType.toLowerCase().includes('hung');
        const isLouver = appType.toLowerCase().includes('louver');
        const isFolding = appType.toLowerCase().includes('fold');

        for (let i = 0; i < P; i++) {
            if (isSliding) {
                if (P === 1) actions.push('slide_right');
                else if (P === 2) actions.push(i === 0 ? 'slide_right' : 'slide_left');
                else if (P === 3) actions.push(i === 0 ? 'fixed' : (i === 1 ? 'slide_right' : 'slide_left'));
                else if (P === 4) actions.push((i === 0 || i === 3) ? 'fixed' : (i === 1 ? 'slide_right' : 'slide_left'));
                else actions.push(i % 2 === 0 ? 'slide_right' : 'slide_left');
            } else if (isCasement) {
                actions.push(i % 2 === 0 ? 'casement_left' : 'casement_right');
            } else if (isAwning) {
                actions.push('awning');
            } else if (isLouver) {
                actions.push('louver');
            } else if (isFolding) {
                actions.push('fold');
            } else {
                actions.push('fixed');
            }
        }
    }

    // SVG Canvas Coordinate Dimensions
    const svgW = 160;
    const svgH = 110;
    const marginX = 14;
    const marginY = 12;

    const drawableW = svgW - marginX * 2 - 10;
    const drawableH = svgH - marginY * 2 - 6;

    const scale = Math.min(drawableW / W, drawableH / H_total);
    const frameW = Math.max(30, W * scale);
    const frameH = Math.max(25, H_total * scale);

    const frameX = marginX + (drawableW - frameW) / 2;
    const frameY = marginY + (drawableH - frameH) / 2;

    const topRatio = hasTop ? H_top / H_total : 0;
    const topFrameH = frameH * topRatio;
    const bottomFrameH = frameH - topFrameH;
    const bottomFrameY = frameY + topFrameH;

    const outerThick = 2.5;
    const sashThick = 1.8;
    const innerPanelW = (frameW - outerThick * 2) / P;

    const uniqueId = `sketch-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div className={`${className} bg-slate-950 rounded-lg p-1 border border-slate-800 shadow-sm flex items-center justify-center relative select-none overflow-hidden group`}>
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full overflow-visible">
                <defs>
                    {/* Glass Tint Gradient */}
                    <linearGradient id={`glassGrad-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                        <stop offset="50%" stopColor="#0284c7" stopOpacity="0.12" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.22" />
                    </linearGradient>

                    {/* Aluminium Outer Profile Gradient */}
                    <linearGradient id={`aluOuter-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#64748b" />
                        <stop offset="50%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#475569" />
                    </linearGradient>

                    {/* Sash Profile Gradient */}
                    <linearGradient id={`aluSash-${uniqueId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                </defs>

                {/* Outer Frame Backing */}
                <rect
                    x={frameX}
                    y={frameY}
                    width={frameW}
                    height={frameH}
                    fill="#030712"
                    stroke={`url(#aluOuter-${uniqueId})`}
                    strokeWidth={outerThick}
                    rx="1"
                />

                {/* ── TOP TRANSOM / FANLIGHT SECTION (IF PRESENT) ── */}
                {hasTop && (
                    <g>
                        <rect
                            x={frameX + outerThick}
                            y={frameY + outerThick}
                            width={frameW - outerThick * 2}
                            height={topFrameH - outerThick}
                            fill={`url(#glassGrad-${uniqueId})`}
                            stroke={`url(#aluSash-${uniqueId})`}
                            strokeWidth={sashThick}
                        />
                        {/* Transom Mid Divider Bar */}
                        <line
                            x1={frameX}
                            y1={frameY + topFrameH}
                            x2={frameX + frameW}
                            y2={frameY + topFrameH}
                            stroke={`url(#aluOuter-${uniqueId})`}
                            strokeWidth={outerThick}
                        />
                        {topType === 'fixed' ? (
                            <line
                                x1={frameX + outerThick + 4}
                                y1={frameY + outerThick + 2}
                                x2={frameX + frameW - outerThick - 4}
                                y2={frameY + topFrameH - 2}
                                stroke="#38bdf8"
                                strokeWidth="0.5"
                                strokeDasharray="2,2"
                                opacity="0.5"
                            />
                        ) : topType === 'awning' ? (
                            <path
                                d={`M ${frameX + outerThick + 2} ${frameY + outerThick + 2} L ${frameX + frameW / 2} ${frameY + topFrameH - 2} L ${frameX + frameW - outerThick - 2} ${frameY + outerThick + 2}`}
                                fill="none"
                                stroke="#38bdf8"
                                strokeWidth="0.75"
                                strokeDasharray="2,2"
                            />
                        ) : (
                            // Louver slats in top
                            [1, 2].map((s) => (
                                <line
                                    key={s}
                                    x1={frameX + outerThick + 2}
                                    y1={frameY + outerThick + (topFrameH / 3) * s}
                                    x2={frameX + frameW - outerThick - 2}
                                    y2={frameY + outerThick + (topFrameH / 3) * s}
                                    stroke="#38bdf8"
                                    strokeWidth="0.75"
                                />
                            ))
                        )}
                    </g>
                )}

                {/* ── MAIN SASH PANELS ── */}
                {Array.from({ length: P }).map((_, i) => {
                    const pX = frameX + outerThick + i * innerPanelW;
                    const pY = bottomFrameY + (hasTop ? 0 : outerThick);
                    const pW = innerPanelW;
                    const pH = bottomFrameH - (hasTop ? outerThick : outerThick * 2);
                    const action = actions[i] || 'slide_right';

                    const isPanelFixed = action.includes('fixed');
                    const isSlideRight = action.includes('slide_right') || action.includes('right');
                    const isSlideLeft = action.includes('slide_left') || action.includes('left');
                    const isCasementLeft = action.includes('casement_left');
                    const isCasementRight = action.includes('casement_right') || action.includes('casement');
                    const isAwning = action.includes('awning');
                    const isLouver = action.includes('louver');
                    const isFold = action.includes('fold');

                    return (
                        <g key={i}>
                            {/* Glass Pane */}
                            <rect
                                x={pX + sashThick / 2}
                                y={pY + sashThick / 2}
                                width={Math.max(1, pW - sashThick)}
                                height={Math.max(1, pH - sashThick)}
                                fill={`url(#glassGrad-${uniqueId})`}
                                stroke={`url(#aluSash-${uniqueId})`}
                                strokeWidth={sashThick}
                            />

                            {/* Diagonal Glass Highlight Line */}
                            <line
                                x1={pX + pW * 0.2}
                                y1={pY + pH * 0.15}
                                x2={pX + pW * 0.4}
                                y2={pY + pH * 0.35}
                                stroke="#ffffff"
                                strokeWidth="0.5"
                                opacity="0.35"
                            />

                            {/* ── ACTION INDICATORS ── */}
                            {/* 1. Sliding Right Arrow */}
                            {isSlideRight && (
                                <g>
                                    <circle cx={pX + pW / 2} cy={pY + pH / 2} r="5.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.75" />
                                    <path
                                        d={`M ${pX + pW / 2 - 2.5} ${pY + pH / 2} L ${pX + pW / 2 + 2.5} ${pY + pH / 2} M ${pX + pW / 2 + 0.5} ${pY + pH / 2 - 2} L ${pX + pW / 2 + 2.5} ${pY + pH / 2} L ${pX + pW / 2 + 0.5} ${pY + pH / 2 + 2}`}
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth="0.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </g>
                            )}

                            {/* 2. Sliding Left Arrow */}
                            {isSlideLeft && (
                                <g>
                                    <circle cx={pX + pW / 2} cy={pY + pH / 2} r="5.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.75" />
                                    <path
                                        d={`M ${pX + pW / 2 + 2.5} ${pY + pH / 2} L ${pX + pW / 2 - 2.5} ${pY + pH / 2} M ${pX + pW / 2 - 0.5} ${pY + pH / 2 - 2} L ${pX + pW / 2 - 2.5} ${pY + pH / 2} L ${pX + pW / 2 - 0.5} ${pY + pH / 2 + 2}`}
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth="0.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </g>
                            )}

                            {/* 3. Fixed Panel Symbol */}
                            {isPanelFixed && (
                                <g opacity="0.6">
                                    <line
                                        x1={pX + 2}
                                        y1={pY + pH - 2}
                                        x2={pX + pW - 2}
                                        y2={pY + 2}
                                        stroke="#0284c7"
                                        strokeWidth="0.5"
                                        strokeDasharray="2,2"
                                    />
                                    <rect x={pX + pW / 2 - 4} y={pY + pH / 2 - 2.5} width="8" height="5" rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.5" />
                                    <text x={pX + pW / 2} y={pY + pH / 2 + 1.2} fontSize="3" fill="#38bdf8" textAnchor="middle" fontWeight="bold">FIX</text>
                                </g>
                            )}

                            {/* 4. Casement Opening Triangle (Left Hinge) */}
                            {isCasementLeft && (
                                <path
                                    d={`M ${pX + 2} ${pY + 2} L ${pX + pW - 2} ${pY + pH / 2} L ${pX + 2} ${pY + pH - 2}`}
                                    fill="none"
                                    stroke="#38bdf8"
                                    strokeWidth="0.75"
                                    strokeDasharray="2,2"
                                />
                            )}

                            {/* 5. Casement Opening Triangle (Right Hinge) */}
                            {isCasementRight && !isCasementLeft && (
                                <path
                                    d={`M ${pX + pW - 2} ${pY + 2} L ${pX + 2} ${pY + pH / 2} L ${pX + pW - 2} ${pY + pH - 2}`}
                                    fill="none"
                                    stroke="#38bdf8"
                                    strokeWidth="0.75"
                                    strokeDasharray="2,2"
                                />
                            )}

                            {/* 6. Awning / Top-Hung Window */}
                            {isAwning && (
                                <path
                                    d={`M ${pX + 2} ${pY + 2} L ${pX + pW / 2} ${pY + pH - 2} L ${pX + pW - 2} ${pY + 2}`}
                                    fill="none"
                                    stroke="#38bdf8"
                                    strokeWidth="0.75"
                                    strokeDasharray="2,2"
                                />
                            )}

                            {/* 7. Louver Window (Multiple Slats) */}
                            {isLouver && (
                                <g>
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <line
                                            key={s}
                                            x1={pX + 2}
                                            y1={pY + (pH / 6) * s}
                                            x2={pX + pW - 2}
                                            y2={pY + (pH / 6) * s}
                                            stroke="#38bdf8"
                                            strokeWidth="0.75"
                                        />
                                    ))}
                                </g>
                            )}

                            {/* 8. Folding Door */}
                            {isFold && (
                                <path
                                    d={`M ${pX + 2} ${pY + 2} L ${pX + pW - 2} ${pY + pH * 0.3} L ${pX + 2} ${pY + pH * 0.7} L ${pX + pW - 2} ${pY + pH - 2}`}
                                    fill="none"
                                    stroke="#38bdf8"
                                    strokeWidth="0.75"
                                    strokeDasharray="2,2"
                                />
                            )}

                            {/* Panel Bottom Identifier Label */}
                            <rect
                                x={pX + pW * 0.15}
                                y={pY + pH - 5}
                                width={pW * 0.7}
                                height="4"
                                rx="0.75"
                                fill="#020617"
                                stroke="#1e293b"
                                strokeWidth="0.4"
                            />
                            <text
                                x={pX + pW / 2}
                                y={pY + pH - 2}
                                fontSize="2.8"
                                fill="#94a3b8"
                                textAnchor="middle"
                                fontWeight="bold"
                                fontFamily="monospace"
                            >
                                P{i + 1}
                            </text>
                        </g>
                    );
                })}

                {/* ── TECHNICAL DIMENSION LABELS & TICKS ── */}
                {/* Width Label (Bottom) */}
                <g>
                    <line
                        x1={frameX}
                        y1={frameY + frameH + 3.5}
                        x2={frameX + frameW}
                        y2={frameY + frameH + 3.5}
                        stroke="#38bdf8"
                        strokeWidth="0.5"
                    />
                    <line
                        x1={frameX}
                        y1={frameY + frameH + 2}
                        x2={frameX}
                        y2={frameY + frameH + 5}
                        stroke="#38bdf8"
                        strokeWidth="0.5"
                    />
                    <line
                        x1={frameX + frameW}
                        y1={frameY + frameH + 2}
                        x2={frameX + frameW}
                        y2={frameY + frameH + 5}
                        stroke="#38bdf8"
                        strokeWidth="0.5"
                    />
                    <rect
                        x={frameX + frameW / 2 - 16}
                        y={frameY + frameH + 1.8}
                        width="32"
                        height="3.5"
                        fill="#020617"
                    />
                    <text
                        x={frameX + frameW / 2}
                        y={frameY + frameH + 4.5}
                        fontSize="3.2"
                        fill="#38bdf8"
                        textAnchor="middle"
                        fontWeight="bold"
                        fontFamily="monospace"
                    >
                        W: {W} mm
                    </text>
                </g>

                {/* Height Label (Right) */}
                <g>
                    <line
                        x1={frameX + frameW + 3.5}
                        y1={frameY}
                        x2={frameX + frameW + 3.5}
                        y2={frameY + frameH}
                        stroke="#38bdf8"
                        strokeWidth="0.5"
                    />
                    <line
                        x1={frameX + frameW + 2}
                        y1={frameY}
                        x2={frameX + frameW + 5}
                        y2={frameY}
                        stroke="#38bdf8"
                        strokeWidth="0.5"
                    />
                    <line
                        x1={frameX + frameW + 2}
                        y1={frameY + frameH}
                        x2={frameX + frameW + 5}
                        y2={frameY + frameH}
                        stroke="#38bdf8"
                        strokeWidth="0.5"
                    />
                    <rect
                        x={frameX + frameW + 1.8}
                        y={frameY + frameH / 2 - 5}
                        width="18"
                        height="10"
                        fill="#020617"
                    />
                    <text
                        x={frameX + frameW + 5.5}
                        y={frameY + frameH / 2 + 1.2}
                        fontSize="3"
                        fill="#38bdf8"
                        fontWeight="bold"
                        fontFamily="monospace"
                        transform={`rotate(90 ${frameX + frameW + 5.5} ${frameY + frameH / 2})`}
                        textAnchor="middle"
                    >
                        H: {H_total}
                    </text>
                </g>
            </svg>
        </div>
    );
}
