import asyncHandler from 'express-async-handler';
import path from 'path';
import { fileURLToPath } from 'url';
import ImportHistory from '../models/ImportHistory.js';
import excelService from '../services/excelService.js';
import PettyCash from '../models/PettyCash.js';
import ProductionBatch from '../models/ProductionBatch.js';
import DailyPnL from '../models/DailyPnL.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generic import handler - row-level validation, bulk insert, error tracking
 */
const handleImport = async (req, type, Model, mapper, sheetPattern = null) => {
  if (!req.file) throw new Error('No file uploaded');

  const history = await ImportHistory.create({
    fileName: req.file.originalname,
    importType: type,
    status: 'processing',
    filePath: req.file.path,
    performedBy: req.user._id,
  });

  try {
    const rawDataRows = await excelService.parseExcelRows(req.file.path, sheetPattern);
    const mappedData = mapper(rawDataRows);

    history.totalRows = mappedData.length;

    const successes = [];
    const errors = [];

    for (let i = 0; i < mappedData.length; i++) {
      const row = mappedData[i];
      const validationError = excelService.validateRow(row, type);
      if (validationError) {
        errors.push({ row: i + 1, message: validationError });
        continue;
      }
      successes.push({ ...row, createdBy: req.user._id });
    }

    // Bulk insert - ordered:false continues past duplicates
    if (successes.length > 0) {
      await Model.insertMany(successes, { ordered: false }).catch(err => {
        // Log but don't fail - some rows may be duplicates
        const bulkErrors = err?.writeErrors || [];
        bulkErrors.forEach(e => {
          errors.push({ row: e.index + 1, message: e.errmsg || 'Insert failed' });
        });
      });
    }

    history.successCount = successes.length - (errors.length || 0);
    history.errorCount = errors.length;
    history.errors = errors;
    history.status = errors.length > 0
      ? (successes.length > 0 ? 'completed_with_errors' : 'failed')
      : 'completed';
    history.completedAt = new Date();
    await history.save();

    return history;
  } catch (err) {
    console.error(`[Import Error] ${type}:`, err);
    history.status = 'failed';
    history.errors = [{ message: err.message }];
    await history.save();
    throw err;
  }
};

/**
 * Import Petty Cash - supports multi-sheet files (one sheet per month)
 */
export const importPettyCash = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No file uploaded');
  }

  const history = await ImportHistory.create({
    fileName: req.file.originalname,
    importType: 'petty_cash',
    status: 'processing',
    filePath: req.file.path,
    performedBy: req.user._id,
  });

  try {
    // Parse all sheets (monthly tabs)
    const allSheets = await excelService.parseAllSheets(req.file.path);
    const allSuccesses = [];
    const allErrors = [];
    let totalRows = 0;

    for (const { sheetName, rows } of allSheets) {
      try {
        const mapped = excelService._parsePettyCashRows(rows);
        totalRows += mapped.length;
        mapped.forEach((row, i) => {
          const err = excelService.validateRow(row, 'petty_cash');
          if (err) {
            allErrors.push({ row: i + 1, sheet: sheetName, message: err });
          } else {
            allSuccesses.push({ ...row, createdBy: req.user._id });
          }
        });
      } catch (sheetErr) {
        console.warn(`[Import] Skipping sheet ${sheetName}: ${sheetErr.message}`);
      }
    }

    if (allSuccesses.length > 0) {
      await PettyCash.insertMany(allSuccesses, { ordered: false }).catch(() => {});
    }

    history.totalRows = totalRows;
    history.successCount = allSuccesses.length;
    history.errorCount = allErrors.length;
    history.errors = allErrors;
    history.status = allSuccesses.length > 0 ? 'completed' : 'failed';
    history.completedAt = new Date();
    await history.save();

    res.json({ success: true, data: history });
  } catch (err) {
    history.status = 'failed';
    history.errors = [{ message: err.message }];
    await history.save();
    res.status(500).json({ success: false, message: err.message });
  }
});

export const importProduction = asyncHandler(async (req, res) => {
  const history = await handleImport(
    req, 'production', ProductionBatch,
    (rows) => {
        // Simple production mapper extracted from old importService
        return rows.slice(2).map(row => ({
            sn: Number(row[0] || 0),
            date: row[1],
            batchNo: String(row[2] || ''),
            product: String(row[3] || ''),
            staff_total: Number(row[6] || 0),
            inputWeight_total: Number(row[12] || 0),
            outputWeight_total: Number(row[19] || 0),
            powder: String(row[20] || ''),
            teaBag: String(row[21] || ''),
            remark: String(row[22] || '')
        })).filter(r => r.batchNo);
    },
    'Production'
  );
  res.json({ success: true, data: history });
});

export const importPnL = asyncHandler(async (req, res) => {
    // Basic P&L mapper
    const history = await handleImport(
        req, 'pnl', DailyPnL,
        (rows) => rows.slice(1).map(row => ({
            date: row[0],
            totalRevenue: Number(row[1] || 0),
            totalCogs: Number(row[2] || 0),
            grossProfit: Number(row[3] || 0),
            netProfit: Number(row[6] || 0)
        })).filter(r => r.date),
        'BE'
    );
  res.json({ success: true, data: history });
});

export const getImportHistory = asyncHandler(async (req, res) => {
  const history = await ImportHistory.find()
    .populate('performedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json({ success: true, data: history });
});
