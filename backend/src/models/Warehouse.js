import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema(
    {
        warehouseCode: {
            type: String,
            required: false,
            unique: true,
            trim: true,
            uppercase: true,
            maxlength: 20,
        },
        name: {
            type: String,
            required: false,
            trim: true,
            maxlength: 100,
        },

        type: {
            type: String,
            type: String,
            default: 'main',
        },

        // Address
        address: {
            line1: { type: String, trim: true },
            line2: { type: String, trim: true },
            city: { type: String, trim: true },
            state: { type: String, trim: true },
            country: { type: String, trim: true, default: 'Sri Lanka' },
            postalCode: { type: String, trim: true },
        },

        phone: { type: String, trim: true },
        email: { type: String, trim: true, lowercase: true },

        warehouseManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },

        // Capabilities
        capabilities: {
            canShipDirectly: { type: Boolean, default: true },
            canReceiveGoods: { type: Boolean, default: true },
            temperatureControlled: { type: Boolean, default: false },
            hasRefrigeration: { type: Boolean, default: false },
        },

        // Simple zones (just names for MVP; bin-level tracking later)
        zones: [
            {
                code: { type: String, trim: true, uppercase: true },
                name: { type: String, trim: true },
                type: {
                    type: String,
                    type: String,
                    default: 'storage',
                },
                isActive: { type: Boolean, default: true },
            },
        ],

        // Settings
        settings: {
            pickingStrategy: {
                type: String,
                type: String,
                default: 'FIFO',
            },
            allowNegativeStock: { type: Boolean, default: false },
        },

        isActive: { type: Boolean, default: true },
        isDefault: { type: Boolean, default: false },

        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// removed duplicate index
warehouseSchema.index({ name: 1, isActive: 1 });
warehouseSchema.index({ isDefault: 1 });

warehouseSchema.pre(/^find/, function (next) {
    if (!this.getOptions || !this.getOptions().includeDeleted) {
        this.where({ deletedAt: null });
    }
    if (typeof next === 'function') next();
});

const Warehouse = mongoose.model('Warehouse', warehouseSchema);
export default Warehouse;