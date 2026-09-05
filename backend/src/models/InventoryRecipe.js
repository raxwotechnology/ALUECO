import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';

const inventoryRecipeSchema = new mongoose.Schema(
    {
        recipeCode: {
            type: String,
            unique: true,
            trim: true,
            uppercase: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        sourceProductId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        destinationProductId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        inputQuantity: {
            type: Number,
            required: true,
            min: 0.001,
            default: 1,
        },
        outputQuantity: {
            type: Number,
            required: true,
            min: 0.001,
            default: 1,
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        notes: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        updatedBy: {
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

// Auto-generate recipeCode before saving
inventoryRecipeSchema.pre('save', async function () {
    if (this.isNew && !this.recipeCode) {
        const seq = await getNextSequence('inventory_recipe');
        this.recipeCode = `IR-${seq}`;
    }
});

// Auto-filter soft-deleted
inventoryRecipeSchema.pre(/^find/, function () {
    if (!this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
});

const InventoryRecipe = mongoose.model('InventoryRecipe', inventoryRecipeSchema);
export default InventoryRecipe;
