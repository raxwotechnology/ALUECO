import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: false },
    module: { type: String, required: false },
    documentId: { type: mongoose.Schema.Types.ObjectId },
    documentCode: String,
    description: String,
    changes: mongoose.Schema.Types.Mixed,
    previousData: mongoose.Schema.Types.Mixed,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    ipAddress: String,
    userAgent: String,
}, { timestamps: true });

auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
