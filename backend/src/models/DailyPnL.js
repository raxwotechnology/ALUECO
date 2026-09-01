import mongoose from 'mongoose';

const dailyPnLSchema = new mongoose.Schema({
  date: { type: Date, required: false },
  day: { type: Number },
  // Expense categories from Excel (March 2026 BE DHY)
  rawMaterial: { type: Number, default: 0 },
  labourSalary: { type: Number, default: 0 },
  supervisorQC: { type: Number, default: 0 },
  electricity: { type: Number, default: 0 },
  firewood: { type: Number, default: 0 },
  packing: { type: Number, default: 0 },
  transport: { type: Number, default: 0 },
  communication: { type: Number, default: 0 },
  other: { type: Number, default: 0 },
  totalExpenses: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  netProfit: { type: Number, default: 0 },
  marginPercent: { type: Number, default: 0 },
  notes: { type: String },
  deletedAt: { type: Date, default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

dailyPnLSchema.pre('save', function () {
    const expenseFields = ['rawMaterial', 'labourSalary', 'supervisorQC', 'electricity', 'firewood', 'packing', 'transport', 'communication', 'other'];
    this.totalExpenses = expenseFields.reduce((acc, field) => acc + (Number(this[field]) || 0), 0);
    this.netProfit = (Number(this.totalRevenue) || 0) - this.totalExpenses;
    if (this.totalRevenue > 0) {
        this.marginPercent = +((this.netProfit / this.totalRevenue) * 100).toFixed(2);
    } else {
        this.marginPercent = 0;
    }
});

const DailyPnL = mongoose.model('DailyPnL', dailyPnLSchema);
export default DailyPnL;
