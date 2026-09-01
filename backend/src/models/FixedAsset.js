import mongoose from 'mongoose';

const paymentInstallmentSchema = new mongoose.Schema({
  amount:    { type: Number, required: true, min: 0 },
  date:      { type: Date, default: Date.now },
  reference: { type: String, trim: true },
  notes:     { type: String, trim: true }
});

const fixedAssetSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  category:      { type: String, required: true, trim: true }, // e.g. Machinery, Land, Vehicle, Building, Furniture
  purchaseCost:  { type: Number, required: true, min: 0 },
  purchaseDate:  { type: Date, required: true, default: Date.now },
  payments:      [paymentInstallmentSchema],
  balanceDue:    { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partially_paid', 'paid'],
    default: 'unpaid'
  },
  deletedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

fixedAssetSchema.pre(/^find/, function() {
  if (!this.getOptions || !this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
});

// Update balances before saving
fixedAssetSchema.pre('save', function() {
  const totalPaid = this.payments.reduce((sum, p) => sum + p.amount, 0);
  this.balanceDue = Math.max(0, this.purchaseCost - totalPaid);
  
  if (totalPaid === 0) {
    this.paymentStatus = 'unpaid';
  } else if (this.balanceDue <= 0.01) {
    this.paymentStatus = 'paid';
  } else {
    this.paymentStatus = 'partially_paid';
  }
});

const FixedAsset = mongoose.model('FixedAsset', fixedAssetSchema);
export default FixedAsset;
