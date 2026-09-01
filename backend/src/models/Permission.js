import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: false,
            unique: true,
            trim: true,
            lowercase: true,
        },
        label: {
            type: String,
            required: false,
            trim: true,
        },
        module: {
            type: String,
            required: false,
            trim: true,
            lowercase: true,
        },
        description: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

permissionSchema.index({ module: 1 });

const Permission = mongoose.model('Permission', permissionSchema);
export default Permission;
