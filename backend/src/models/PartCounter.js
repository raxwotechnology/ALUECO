import mongoose from 'mongoose';

const partCounterSchema = new mongoose.Schema(
    {
        _id: { 
            type: String, 
            required: true 
        }, // Format: parts:[CategoryShortCode]:[YY][JulianDay] (e.g. parts:MAC:26155)
        sequence: { 
            type: Number, 
            required: true, 
            default: 0 
        }
    },
    { timestamps: true }
);

// Expire logs after 30 days to avoid index bloat
partCounterSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const PartCounter = mongoose.model('PartCounter', partCounterSchema);
export default PartCounter;
