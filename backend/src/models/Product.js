import mongoose from 'mongoose';
import { getNextSequence } from './Counter.js';
import { attachSyncTriggers } from '../utils/syncTriggers.js';

const productSchema = new mongoose.Schema(
    {
        productCode: {
            type: String,
            unique: true,
            trim: true,
            uppercase: true,
        },
        productShortCode: {
            type: String,
            trim: true,
            uppercase: true,
            maxlength: 3,
        },
        sku: {
            type: String,
            trim: true,
            sparse: true, // allows multiple nulls but enforces uniqueness when present
            uppercase: true,
        },
        barcode: {
            type: String,
            trim: true,
            sparse: true,
        },

        name: {
            type: String,
            required: false,
            trim: true,
            maxlength: 200,
        },
        productType: {
            type: String,
            type: String,
            default: 'finished_good',
        },
        canBeManufactured: { type: Boolean, default: false },
        canBePurchased: { type: Boolean, default: true },
        canBeSold: { type: Boolean, default: true },
        shortName: {
            type: String,
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 2000,
        },

        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: false,
        },
        brandId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Brand',
        },
        tags: [{ type: String, trim: true }],

        type: {
            type: String,
            type: String,
            default: 'trading',
        },

        unitOfMeasure: {
            type: String,
            required: false,
            trim: true,
        },

        // Pricing — LKR only for MVP
        basePrice: {
            type: Number,
            required: false,
            min: 0,
        },
        mrp: {
            type: Number,
            min: 0,
        },
        currency: {
            type: String,
            default: 'LKR',
        },

        // Tiered wholesale pricing (optional)
        tierPricing: [
            {
                tierName: { type: String, trim: true },
                minQuantity: { type: Number, min: 0 },
                maxQuantity: { type: Number },
                price: { type: Number, min: 0 },
            },
        ],

        // Tax
        tax: {
            taxable: { type: Boolean, default: true },
            taxRate: { type: Number, default: 18, min: 0, max: 100 }, // SL VAT default 18%
            hsCode: { type: String, trim: true },
        },

        // Cost tracking
        costs: {
            lastPurchaseCost: { type: Number, default: 0, min: 0 },
            averageCost: { type: Number, default: 0, min: 0 },
            standardCost: { type: Number, default: 0, min: 0 },
        },

        // Stock rules
        stockLevels: {
            minimumLevel: { type: Number, default: 0, min: 0 },
            reorderLevel: { type: Number, default: 0, min: 0 },
            maximumLevel: { type: Number, default: 0, min: 0 },
        },

        // Packaging
        packaging: {
            unitsPerCarton: { type: Number, min: 0 },
            cartonsPerPallet: { type: Number, min: 0 },
        },

        // Sales configuration
        salesConfig: {
            sellable: { type: Boolean, default: true },
            minimumOrderQuantity: { type: Number, default: 1, min: 0 },
            allowBackorder: { type: Boolean, default: false },
        },

        status: {
            type: String,
            default: 'active',
        },

        notes: { type: String, trim: true, maxlength: 1000 },

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

// Indexes for performance
productSchema.index({ name: 'text', shortName: 'text', sku: 'text', productCode: 'text' });
productSchema.index({ categoryId: 1, status: 1 });
productSchema.index({ brandId: 1, status: 1 });
productSchema.index({ status: 1 });

// Auto-generate productCode before saving
productSchema.pre('save', async function () {
    if (this.isNew && !this.productCode) {
        const seq = await getNextSequence('product');
        const Category = mongoose.model('Category');
        const cat = await Category.findById(this.categoryId);
        const codeBase = cat ? (cat.code || cat.name) : 'GEN';
        const shortCode = codeBase.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
        const pShort = this.productShortCode ? this.productShortCode.toUpperCase() : 'PRD';
        
        const today = new Date();
        const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const utcJan1 = Date.UTC(today.getFullYear(), 0, 1);
        const dayOfYear = Math.floor((utcToday - utcJan1) / (24 * 60 * 60 * 1000)) + 1;
        const julianDay = dayOfYear.toString().padStart(3, '0');
        const yearShort = today.getFullYear().toString().slice(-2);
        const sequenceNo = seq.toString().padStart(2, '0');
        
        this.productCode = `P-${shortCode}-${pShort}-${yearShort}${julianDay}-${sequenceNo}`;
    }
});

// Auto-filter soft-deleted
productSchema.pre(/^find/, function () {
    if (!this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
});

attachSyncTriggers(productSchema, 'products', 'Product');

const Product = mongoose.model('Product', productSchema);
export default Product;