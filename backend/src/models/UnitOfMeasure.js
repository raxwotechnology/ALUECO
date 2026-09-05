import mongoose from 'mongoose';

const unitOfMeasureSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: false,
            trim: true,
            unique: true,
            maxlength: 50,
        },
        symbol: {
            type: String,
            required: false,
            trim: true,
            unique: true,
            maxlength: 10,
        },
        type: {
            type: String,
            type: String,
            required: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

const UnitOfMeasure = mongoose.model('UnitOfMeasure', unitOfMeasureSchema);
export default UnitOfMeasure;