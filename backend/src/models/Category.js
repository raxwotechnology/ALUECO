import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: false,
            trim: true,
            maxlength: 100,
        },
        code: {
            type: String,
            required: false,
            unique: true,
            trim: true,
            uppercase: true,
            maxlength: 20,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
        },
        parentCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            default: null,
        },
        type: {
            type: String,
            type: String,
            default: 'product',
        },
        displayOrder: {
            type: Number,
            default: 0,
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

// Index for search performance
categorySchema.index({ name: 'text', code: 'text' });
categorySchema.index({ parentCategory: 1, isActive: 1 });

// Auto-filter soft-deleted
categorySchema.pre(/^find/, function () {
    if (!this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
});

const Category = mongoose.model('Category', categorySchema);
export default Category;