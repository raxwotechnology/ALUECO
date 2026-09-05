import ExcelJS from 'exceljs';
import PdfPrinter from 'pdfkit-table';
import { Stream } from 'stream';

/**
 * ReportService
 * Handles professional generation of Excel and PDF files from DB data.
 */
class ReportService {
    /**
     * Generate Excel File
     * @param {string} title - Sheet/File title
     * @param {Array} columns - Column definitions [{ header: 'Name', key: 'name', width: 20 }]
     * @param {Array} data - Row data
     * @returns {Promise<Buffer>}
     */
    async generateExcel(title, columns, data) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(title);

        // Add headers and format them
        worksheet.columns = columns.map(col => ({
            header: col.header,
            key: col.key,
            width: col.width || 20
        }));

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E293B' } // Slate-800
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // Add data
        worksheet.addRows(data);

        // Format alternating rows and borders
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                if (rowNumber % 2 === 0) {
                    row.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF8FAFC' } // Slate-50
                    };
                }
            }
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
            });
        });

        return await workbook.xlsx.writeBuffer();
    }

    /**
     * Generate PDF File
     * @param {Object} options - { title, columns, data, user }
     * @returns {Promise<Buffer>}
     */
    async generatePDF({ title, columns, data, user }) {
        return new Promise((resolve, reject) => {
            const doc = new PdfPrinter({
                margin: 30,
                size: columns.length > 7 ? 'A4' : 'A4',
                layout: columns.length > 7 ? 'landscape' : 'portrait'
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            // 1. Header with branding
            doc.rect(0, 0, doc.page.width, 60).fill('#2563EB');
            doc.fillColor('#FFFFFF').fontSize(20).text('WHOLESALE ERP', 30, 20);
            doc.fontSize(10).text('Enterprise Management System', 30, 45);

            doc.fillColor('#FFFFFF').fontSize(14).text(title.toUpperCase(), 30, 20, { align: 'right' });
            doc.fontSize(8).text(`Date: ${new Date().toLocaleString()}`, 30, 38, { align: 'right' });
            if (user) {
                doc.text(`Exported by: ${user.name} (${user.role})`, 30, 48, { align: 'right' });
            }

            // 2. Table
            const tableData = data.map(row => {
                const newRow = {};
                columns.forEach(col => {
                    const val = row[col.key];
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                        newRow[col.key] = val.name || val.code || JSON.stringify(val);
                    } else {
                        newRow[col.key] = val ?? '—';
                    }
                });
                return newRow;
            });

            const table = {
                title: '',
                headers: columns.map(c => ({ label: c.header, property: c.key, width: c.width || 80 })),
                datas: tableData,
                options: {
                    padding: 5,
                    columnSpacing: 10,
                    divider: {
                        header: { disabled: false, width: 2, opacity: 1 },
                        horizontal: { disabled: false, width: 1, opacity: 0.1 }
                    }
                }
            };

            doc.moveDown(5);
            
            async function finish() {
                // Footer
                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    doc.fontSize(8).fillColor('#94A3B8').text(
                        `Page ${i + 1} of ${range.count}`,
                        0,
                        doc.page.height - 20,
                        { align: 'center', width: doc.page.width }
                    );
                }
                doc.end();
            }

            try {
                const result = doc.table(table, {
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9).fillColor('#1E293B'),
                    prepareRow: (row, index, column, rectRow, rectCell) => {
                        doc.font("Helvetica").fontSize(8).fillColor('#334155');
                    },
                });

                // If it returns a promise, await it, otherwise just finish
                if (result instanceof Promise) {
                    result.then(finish).catch(reject);
                } else {
                    finish();
                }
            } catch (err) {
                reject(err);
            }
        });
    }
}

export const reportService = new ReportService();
export const generateExcelReport = reportService.generateExcel.bind(reportService);
export const generatePDFReport = reportService.generatePDF.bind(reportService);
