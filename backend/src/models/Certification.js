import mongoose from 'mongoose';

const certificationSchema = new mongoose.Schema({
    name:              { type: String, required: false },
    issuingBody:       { type: String },
    certificateNumber: { type: String },
    validFrom:         { type: Date },
    validUntil:        { type: Date },
    scope:             { type: String },
    documentUrl:       { type: String },
    status:            { type: String, default: 'active' },
    renewalReminder:   { type: Number, default: 90 }, // days before expiry to alert

    // ── ALE-specific additions ────────────────────────────────────────────────
    market: {
        type: String,
        enum: ['EU', 'USA', 'UAE', 'Japan', 'UK', 'Global', 'Other'],
        default: 'Global',
    },
    certificationBody: { type: String }, // e.g. "Control Union", "IMO", "USDA"

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

certificationSchema.index({ validUntil: 1, status: 1 }); // For daily expiry cron

export default mongoose.model('Certification', certificationSchema);
