import mongoose from 'mongoose';

const qcResultSchema = new mongoose.Schema({
  batch:      { type: mongoose.Schema.Types.ObjectId, ref: 'ProductionBatch', required: true },
  checkpoint: { type: mongoose.Schema.Types.ObjectId, ref: 'QCCheckpoint' },

  // ── Sample Info ──────────────────────────────────────────────────────────
  sampleId:      { type: String }, // Internal random sample label
  sampleWeightG: { type: Number }, // Grams taken for sample

  // ── External Lab Details ─────────────────────────────────────────────────
  labName: {
    type: String,
    enum: ['ITI', 'SGS', 'SLSI', 'Intertek', 'Internal', 'Other'],
  },
  externalRefNo: { type: String }, // Lab's own report reference number
  labReportUrl:  { type: String }, // Uploaded PDF of lab report

  // ── Test Parameters ──────────────────────────────────────────────────────
  testType: {
    type: String,
    enum: ['heavy_metals', 'pesticide_residue', 'microbiology', 'moisture', 'aflatoxin', 'full_panel'],
  },
  parameterResults: [{
    parameterName: { type: String },  // e.g. "Lead (Pb)", "E.coli", "Moisture %"
    value:         { type: Number },
    unit:          { type: String },  // e.g. "mg/kg", "CFU/g", "%"
    maxLimit:      { type: Number },  // Regulatory limit
    withinSpec:    { type: Boolean },
  }],

  // ── Verdict ──────────────────────────────────────────────────────────────
  overallResult: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'conditional'],
    default: 'pending',
  },
  inspectedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  inspectedAt:      { type: Date },
  correctiveAction: { type: String },
  notes:            { type: String },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

qcResultSchema.index({ batch: 1, overallResult: 1 });
qcResultSchema.index({ labName: 1, inspectedAt: -1 });
qcResultSchema.index({ batch: 1, checkpoint: 1 });

export default mongoose.model('QCResult', qcResultSchema);
