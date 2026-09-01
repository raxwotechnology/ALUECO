import mongoose from 'mongoose';

const brandSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: false,
            trim: true,
            unique: true,
            maxlength: 100,
        },
        code: {
            type: String,
            trim: true,
            uppercase: true,
            maxlength: 20,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        isOwnBrand: {
            type: Boolean,
            default: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        deletedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

brandSchema.index({ name: 'text' });

brandSchema.pre(/^find/, function () {
    if (!this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
});

const Brand = mongoose.model('Brand', brandSchema);
export default Brand;