import mongoose from 'mongoose';

const smsLogSchema = new mongoose.Schema({
  date:          { type: Date, default: Date.now },
  supplierName:  { type: String, required: true },
  supplierPhone: { type: String, required: true },
  message:       { type: String, required: true },
  grnId:         { type: mongoose.Schema.Types.ObjectId, ref: 'GoodsReceiptNote' },
  status:        { type: String, enum: ['sent', 'failed'], default: 'sent' },
  deletedAt:     { type: Date, default: null }
}, { timestamps: true });

smsLogSchema.pre(/^find/, function(next) {
  if (!this.getOptions || !this.getOptions().includeDeleted) {
    this.where({ deletedAt: null });
  }
  if (typeof next === 'function') next();
});

const SmsLog = mongoose.model('SmsLog', smsLogSchema);
export default SmsLog;
