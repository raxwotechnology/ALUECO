/**
 * Guillotine 2D Bin Packing Solver for Glass Sheets
 */
export const solve2DGlassPacking = (panels, sheetW = 2438, sheetH = 1219) => {
    // Sort panels by area descending for better packing efficiency
    const sortedPanels = [...panels]
        .map((p, idx) => ({ ...p, area: p.width * p.height, originalIdx: idx }))
        .sort((a, b) => b.area - a.area);

    const sheets = [];

    const createNewSheet = () => {
        return {
            width: sheetW,
            height: sheetH,
            freeRects: [{ x: 0, y: 0, w: sheetW, h: sheetH }],
            placedPanels: []
        };
    };

    for (const panel of sortedPanels) {
        let placed = false;

        // Try to place in existing sheets
        for (const sheet of sheets) {
            placed = tryPlaceInSheet(sheet, panel);
            if (placed) break;
        }

        // If it doesn't fit in any existing sheet, open a new sheet
        if (!placed) {
            const newSheet = createNewSheet();
            placed = tryPlaceInSheet(newSheet, panel);
            if (placed) {
                sheets.push(newSheet);
            } else {
                // If a single panel is larger than the sheet, place it as oversized
                sheets.push({
                    width: panel.width,
                    height: panel.height,
                    freeRects: [],
                    placedPanels: [{
                        x: 0,
                        y: 0,
                        width: panel.width,
                        height: panel.height,
                        isOversized: true,
                        glassType: panel.glassType
                    }]
                });
            }
        }
    }

    // Format output
    return sheets.map((sheet, idx) => {
        const sheetArea = sheet.width * sheet.height;
        const usedArea = sheet.placedPanels.reduce((sum, p) => sum + (p.width * p.height), 0);
        const wasteArea = sheetArea - usedArea;
        const wastePercent = sheetArea > 0 ? (wasteArea / sheetArea) * 100 : 0;

        return {
            sheetIndex: idx + 1,
            width: sheet.width,
            height: sheet.height,
            panels: sheet.placedPanels,
            usedAreaSqFt: parseFloat(((usedArea) / 92903.04).toFixed(2)),
            wastePercent: parseFloat(wastePercent.toFixed(1))
        };
    });
};

const tryPlaceInSheet = (sheet, panel) => {
    const pW = panel.width;
    const pH = panel.height;

    for (let i = 0; i < sheet.freeRects.length; i++) {
        const free = sheet.freeRects[i];

        // Try fit directly
        let fitWidth = pW;
        let fitHeight = pH;
        let fits = false;

        if (free.w >= pW && free.h >= pH) {
            fits = true;
        } else if (free.w >= pH && free.h >= pW) {
            // Rotated fit
            fitWidth = pH;
            fitHeight = pW;
            fits = true;
        }

        if (fits) {
            // Place panel
            sheet.placedPanels.push({
                x: free.x,
                y: free.y,
                width: fitWidth,
                height: fitHeight,
                glassType: panel.glassType
            });

            // Perform guillotine split
            const remW = free.w - fitWidth;
            const remH = free.h - fitHeight;

            // Remove old free rect
            sheet.freeRects.splice(i, 1);

            // Split: decide split axis (longer axis split)
            if (remW > remH) {
                // Split vertically
                if (remW > 0) {
                    sheet.freeRects.push({
                        x: free.x + fitWidth,
                        y: free.y,
                        w: remW,
                        h: free.h
                    });
                }
                if (remH > 0) {
                    sheet.freeRects.push({
                        x: free.x,
                        y: free.y + fitHeight,
                        w: fitWidth,
                        h: remH
                    });
                }
            } else {
                // Split horizontally
                if (remH > 0) {
                    sheet.freeRects.push({
                        x: free.x,
                        y: free.y + fitHeight,
                        w: free.w,
                        h: remH
                    });
                }
                if (remW > 0) {
                    sheet.freeRects.push({
                        x: free.x + fitWidth,
                        y: free.y,
                        w: remW,
                        h: fitHeight
                    });
                }
            }

            return true;
        }
    }

    return false;
};
