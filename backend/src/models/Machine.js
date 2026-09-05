import mongoose from 'mongoose';

const machineSchema = new mongoose.Schema({
    name: { type: String, required: false },
    code: { type: String, unique: true },
    type: { type: String }, // dryer, powderer, etc.
    status: { type: String, default: 'active' }, // active, maintenance, broken
    capacity: { type: Number },
    fuelType: { type: String, enum: ['electric', 'wood', 'diesel', 'gas', 'other'], default: 'electric' },
    hourlyCost: { type: Number, default: 0 },
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date,
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Machine', machineSchema);
