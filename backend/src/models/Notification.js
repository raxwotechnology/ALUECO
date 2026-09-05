import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    type: { type: String, required: false },
    title: { type: String, required: false },
    message: { type: String, required: false },
    link: String,
    isRead: { type: Boolean, default: false },
    readAt: Date,
    metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
