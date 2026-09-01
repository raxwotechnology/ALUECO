import asyncHandler from 'express-async-handler';
import PettyCash from '../models/PettyCash.js';
import ProductionBatch from '../models/ProductionBatch.js';
import DailyPnL from '../models/DailyPnL.js';
import excelService from '../services/excelService.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ────── PETTY CASH ──────────────────────────────────────

export const getPettyCash = asyncHandler(async (req, res) => {
  const { page = 1, limit = 100, search = '' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const filter = { deletedAt: null };
  if (search) {
    filter.$or = [
      { item: { $regex: search, $options: 'i' } },
      { supplier: { $regex: search, $options: 'i' } },
      { refNo: { $regex: search, $options: 'i' } },
    ];
  }
  const [data, total] = await Promise.all([
    PettyCash.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)).lean(),
    PettyCash.countDocuments(filter),
  ]);
  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

export const createPettyCash = asyncHandler(async (req, res) => {
  const entry = await PettyCash.create({ ...req.body, createdBy: req.user._id });
  // Async disk sync - add row to Excel
  excelService.appendExcelRow('petty_cash', entry.toObject()).catch(console.error);
  res.status(201).json({ success: true, data: entry });
});

export const updatePettyCash = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await PettyCash.findByIdAndUpdate(
    id,
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!updated) { res.status(404); throw new Error('Record not found'); }
  excelService.updateExcelRow('petty_cash', updated.toObject()).catch(console.error);
  res.json({ success: true, data: updated });
});

export const deletePettyCash = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await PettyCash.findById(id);
  if (!item) { res.status(404); throw new Error('Record not found'); }
  await excelService.deleteExcelRow('petty_cash', item.toObject()).catch(console.error);
  await PettyCash.findByIdAndDelete(id);
  res.json({ success: true, message: 'Deleted successfully' });
});

// ────── PRODUCTION ──────────────────────────────────────

export const getProduction = asyncHandler(async (req, res) => {
  const { page = 1, limit = 100, search = '' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const filter = { deletedAt: null };
  if (search) {
    filter.$or = [
      { batchNo: { $regex: search, $options: 'i' } },
      { product: { $regex: search, $options: 'i' } },
    ];
  }
  const [data, total] = await Promise.all([
    ProductionBatch.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)).lean(),
    ProductionBatch.countDocuments(filter),
  ]);
  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

export const createProduction = asyncHandler(async (req, res) => {
  const entry = await ProductionBatch.create({ ...req.body, createdBy: req.user._id });
  excelService.appendExcelRow('production', entry.toObject()).catch(console.error);
  res.status(201).json({ success: true, data: entry });
});

export const updateProduction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await ProductionBatch.findByIdAndUpdate(
    id,
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!updated) { res.status(404); throw new Error('Record not found'); }
  excelService.updateExcelRow('production', updated.toObject()).catch(console.error);
  res.json({ success: true, data: updated });
});

export const deleteProduction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await ProductionBatch.findById(id);
  if (!item) { res.status(404); throw new Error('Record not found'); }
  await excelService.deleteExcelRow('production', item.toObject()).catch(console.error);
  await ProductionBatch.findByIdAndDelete(id);
  res.json({ success: true, message: 'Deleted successfully' });
});

// ────── P&L ─────────────────────────────────────────────

export const getPnL = asyncHandler(async (req, res) => {
  const { page = 1, limit = 100 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const filter = { deletedAt: null };
  const [data, total] = await Promise.all([
    DailyPnL.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)).lean(),
    DailyPnL.countDocuments(filter),
  ]);
  res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

export const createPnL = asyncHandler(async (req, res) => {
  const entry = await DailyPnL.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: entry });
});

export const updatePnL = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updated = await DailyPnL.findByIdAndUpdate(
    id,
    { ...req.body, updatedBy: req.user._id },
    { new: true, runValidators: true }
  );
  if (!updated) { res.status(404); throw new Error('Record not found'); }
  excelService.updateExcelRow('pnl', updated.toObject()).catch(console.error);
  res.json({ success: true, data: updated });
});

export const deletePnL = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await DailyPnL.findById(id);
  if (!item) { res.status(404); throw new Error('Record not found'); }
  await DailyPnL.findByIdAndDelete(id);
  res.json({ success: true, message: 'Deleted successfully' });
});

// ────── TEMPLATE EXPORT ──────────────────────────────────

export const exportWithTemplate = asyncHandler(async (req, res) => {
  const { type } = req.params;
  const key = type.replace('-', '_');
  const fileName = excelService.masterFiles[key];

  if (!fileName) {
    res.status(400).json({ message: `Unknown type: ${type}` });
    return;
  }

  // Try project root first, then one level up
  const candidates = [
    path.resolve(process.cwd(), fileName),
    path.resolve(process.cwd(), '..', fileName),
    path.resolve(__dirname, '../../../', fileName),
  ];

  for (const filePath of candidates) {
    if (await fs.pathExists(filePath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      return res.download(filePath);
    }
  }

  res.status(404).json({ message: 'Source Excel file not found on server. Import a file first.' });
});
