import mongoose from 'mongoose';

const importHistorySchema = new mongoose.Schema({
    fileName: { type: String, required: false },
    importType: { 
        type: String, 
        type: String, 
        required: false 
    },
    status: { 
        type: String, 
        type: String, 
        default: 'pending' 
    },
    totalRows: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    errors: [{
        row: Number,
        data: mongoose.Schema.Types.Mixed,
        message: String
    }],
    filePath: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    completedAt: Date,
}, { timestamps: true });

export default mongoose.model('ImportHistory', importHistorySchema);
