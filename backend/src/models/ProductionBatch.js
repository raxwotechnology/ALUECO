import mongoose from 'mongoose';

// ── Helper: Julian Day of Year ─────────────────────────────────────────────
function julianDay(date) {
  const d = new Date(date);
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / (1000 * 60 * 60 * 24)); // 1–366
}

// ── Helper: Generate ALE Julian Batch Code ─────────────────────────────────
function generateBatchCode(date, supplierShortCode) {
  const d   = new Date(date);
  const yy  = String(d.getFullYear()).slice(-2);
  const ddd = String(julianDay(d)).padStart(3, '0');
  const sup = (supplierShortCode || 'UNKNOWN').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  return `${sup}-ALE${yy}${ddd}`;
  // Example: CHAMINDA-ALE26002
}

const productionBatchSchema = new mongoose.Schema({

  // ── Identifiers ──────────────────────────────────────────────────────────
  sn:      { type: Number },
  batchNo: { type: String, unique: true, sparse: true }, // Julian auto-code
  date:    { type: Date, required: true, default: Date.now },

  // ── Source ───────────────────────────────────────────────────────────────
  supplierId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierShortCode: { type: String }, // Denormalised for batch code generation
  product:           { type: String }, // Product name e.g. "Moringa Powder"
  productId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  templateId:        { type: mongoose.Schema.Types.ObjectId, ref: 'ProcessTemplate' },
  warehouseId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },

  // ── Staff Counts (Day / Night) ───────────────────────────────────────────
  staff_day:         { type: Number, default: 0 },
  staff_night:       { type: Number, default: 0 },
  staff_total:       { type: Number, default: 0 },  // auto-computed
  otherStaff_day:    { type: Number, default: 0 },
  otherStaff_night:  { type: Number, default: 0 },
  otherStaff_total:  { type: Number, default: 0 }, // auto-computed

  // ── Input Weights (Kg) ───────────────────────────────────────────────────
  inputWeight_day:    { type: Number, default: 0 },
  inputWeight_night:  { type: Number, default: 0 },
  inputWeight_total:  { type: Number, default: 0 }, // auto-computed

  // ── Processing Stages ────────────────────────────────────────────────────
  rejects_day:              { type: Number, default: 0 },
  rejects_night:            { type: Number, default: 0 },
  weightBeforeDrying_day:   { type: Number, default: 0 },
  weightBeforeDrying_night: { type: Number, default: 0 },

  // ── Dryer Operational Log ────────────────────────────────────────────────
  dryingHours_day:    { type: Number, default: 0 },
  dryingHours_night:  { type: Number, default: 0 },
  firewoodKg_day:     { type: Number, default: 0 }, // Firewood consumed per shift
  firewoodKg_night:   { type: Number, default: 0 },
  electricityUnits:   { type: Number, default: 0 }, // kWh

  // ── Output Weights (Kg) ──────────────────────────────────────────────────
  outputWeight_day:    { type: Number, default: 0 },
  outputWeight_night:  { type: Number, default: 0 },
  outputWeight_total:  { type: Number, default: 0 }, // auto-computed

  // ── Finished Product Split ───────────────────────────────────────────────
  powder: { type: Number, default: 0 }, // Kg of powder produced
  teaBag: { type: Number, default: 0 }, // Kg equiv for tea bags

  // ── Efficiency (auto-calculated) ─────────────────────────────────────────
  efficiencyPercentage: { type: Number, default: 0 },
  // Formula: (outputWeight_total / inputWeight_total) × 100

  // ── MES Stage ────────────────────────────────────────────────────────────
  processingStage: {
    type: String,
    enum: ['raw_received','washing_cutting','pre_dry_weighing','drying','powdering','packing','completed'],
    default: 'raw_received',
  },
  stageTimestamps: {
    washing_cutting:  { type: Date },
    pre_dry_weighing: { type: Date },
    drying:           { type: Date },
    powdering:        { type: Date },
    packing:          { type: Date },
    completed:        { type: Date },
  },

  // ── Machine Assignments ──────────────────────────────────────────────────
  machineAssignments: [{
    machineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine' },
    startTime: Date,
    endTime:   Date,
    notes:     String,
  }],

  // ── QC Link ──────────────────────────────────────────────────────────────
  qcStatus:   { type: String, enum: ['pending','approved','rejected','hold'], default: 'pending' },
  qcResultId: { type: mongoose.Schema.Types.ObjectId, ref: 'QCResult' },

  remark:    { type: String },
  status:    { type: String, default: 'completed' },
  deletedAt: { type: Date, default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, { timestamps: true });

// ── Pre-save Hook: Auto-generate Julian Batch Code & Compute Totals ─────────
productionBatchSchema.pre('save', function(next) {
  // 1. Staff totals
  this.staff_total      = (this.staff_day      || 0) + (this.staff_night      || 0);
  this.otherStaff_total = (this.otherStaff_day || 0) + (this.otherStaff_night || 0);

  // 2. Weight totals
  this.inputWeight_total  = (this.inputWeight_day  || 0) + (this.inputWeight_night  || 0);
  this.outputWeight_total = (this.outputWeight_day || 0) + (this.outputWeight_night || 0);

  // 3. Efficiency %
  if (this.inputWeight_total > 0) {
    this.efficiencyPercentage = parseFloat(
      ((this.outputWeight_total / this.inputWeight_total) * 100).toFixed(2)
    );
  }

  // 4. Generate Julian Batch Code (new documents only)
  if (this.isNew && !this.batchNo) {
    this.batchNo = generateBatchCode(this.date, this.supplierShortCode);
  }

  next();
});

productionBatchSchema.pre(/^find/, function(next) {
  if (!this.getOptions || !this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  if (typeof next === 'function') next();
});

productionBatchSchema.index({ date: -1 });
productionBatchSchema.index({ supplierId: 1, date: -1 });
productionBatchSchema.index({ qcStatus: 1 });
productionBatchSchema.index({ processingStage: 1 });

const ProductionBatch = mongoose.model('ProductionBatch', productionBatchSchema);
export default ProductionBatch;
