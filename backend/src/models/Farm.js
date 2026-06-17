import mongoose from 'mongoose';

const farmSchema = new mongoose.Schema({
    farmCode: { type: String, unique: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    deletedAt: { type: Date, default: null }
}, { timestamps: true });

farmSchema.pre('save', async function() {
    if (this.isNew && !this.farmCode) {
        const seq = await mongoose.model('Counter').findOneAndUpdate(
            { _id: 'farm' },
            { $inc: { sequence: 1 } },
            { new: true, upsert: true }
        );
        this.farmCode = `FRM-${seq.sequence.toString().padStart(3, '0')}`;
    }
});

farmSchema.pre(/^find/, function(next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const Farm = mongoose.model('Farm', farmSchema);
export default Farm;
