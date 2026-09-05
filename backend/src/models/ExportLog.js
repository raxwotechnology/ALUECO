import mongoose from 'mongoose';

const exportLogSchema = new mongoose.Schema({
    module: {
        type: String,
        required: false,
        index: true
    },
    trigger: {
        type: String,
        default: 'automatic'
    },
    formats: [{
        type: String
    }],
    filePaths: {
        json: String,
        excel: String,
        csv: String,
        pdf: String
    },
    status: {
        type: String,
        default: 'pending'
    },
    recordsCount: {
        type: Number,
        default: 0
    },
    error: {
        type: String
    },
    executedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

const ExportLog = mongoose.model('ExportLog', exportLogSchema);

export default ExportLog;
