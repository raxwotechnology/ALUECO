import mongoose from 'mongoose';

const socialCredentialSchema = new mongoose.Schema({
    platform: {
        type: String,
        required: true,
        enum: ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'RapidAPI']
    },
    apiKey: {
        type: String,
        required: true
    },
    accountId: {
        type: String,
        required: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const SocialCredential = mongoose.model('SocialCredential', socialCredentialSchema);
export default SocialCredential;
