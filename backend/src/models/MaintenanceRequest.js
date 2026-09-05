import mongoose from 'mongoose';

const maintenanceRequestSchema = new mongoose.Schema({
    requestCode: { type: String, unique: true },
    title: { type: String, required: false },
    description: { type: String, required: false },
    assetId: { type: String, required: false },
    category: { type: String, default: 'machine' },
    priority: { type: String, default: 'normal' },
    type: { type: String, default: 'corrective' },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    scheduledDate: Date,
    completedDate: Date,
    partsUsed: [{ name: String, quantity: Number, cost: Number }],
    laborHours: Number,
    totalCost: { type: Number, default: 0 },
    downtime: Number,
    status: { type: String, default: 'pending' },
    recurrence: { type: String, default: 'none' },
    nextScheduled: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

maintenanceRequestSchema.index({ status: 1, priority: -1 });

maintenanceRequestSchema.pre('validate', async function () {
    if (!this.requestCode) {
        const date = new Date();
        const prefix = `MR-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const count = await this.constructor.countDocuments({ requestCode: { $regex: `^${prefix}` } });
        this.requestCode = `${prefix}-${String(count + 1).padStart(3, '0')}`;
    }
});

export default mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
