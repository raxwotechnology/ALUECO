import mongoose from 'mongoose';

const pettyCashSchema = new mongoose.Schema({
  date:     { type: Date, required: false, default: Date.now },
  refNo:    { type: String },
  item:     { type: String, required: false },
  supplier: { type: String },
  amount:   { type: Number, default: 0 },
  category: { type: String },

  // ── Transaction Type (NEW) ────────────────────────────────────────────────
  transactionType: {
    type: String,
    enum: ['receipt', 'expense'],
    default: 'expense',
    // 'receipt' = funds added to petty cash pool (e.g. Rs 500,000 top-up)
    // 'expense' = money paid out across categories below
  },
  poolId: {
    type: String,
    default: 'MAIN',
    // Supports multiple pools: FACTORY / HEAD_OFFICE
  },

  // ── Category Columns ─────────────────────────────────────────────────────
  rawMaterial_nos:  { type: Number, default: 0 },
  rawMaterial_rate: { type: Number, default: 0 },
  rawMaterial_cost: { type: Number, default: 0 },
  chemicals:        { type: Number, default: 0 },
  transport:        { type: Number, default: 0 },
  welfare:          { type: Number, default: 0 },
  fuel:             { type: Number, default: 0 },
  maintenance:      { type: Number, default: 0 },
  stationary:       { type: Number, default: 0 },
  miscWages:        { type: Number, default: 0 },
  wood:             { type: Number, default: 0 },
  packingMaterials: { type: Number, default: 0 },

  balance: { type: Number, default: 0 }, // running balance snapshot
  status:  { type: String, default: 'approved' },

  deletedAt: { type: Date, default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

pettyCashSchema.index({ poolId: 1, date: 1 });
pettyCashSchema.index({ transactionType: 1, date: -1 });

pettyCashSchema.pre(/^find/, function(next) {
  if (!this.getOptions || !this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  if (typeof next === 'function') next();
});

const PettyCash = mongoose.model('PettyCash', pettyCashSchema);
export default PettyCash;
