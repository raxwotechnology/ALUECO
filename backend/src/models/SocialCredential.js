import mongoose from 'mongoose';

const socialCredentialSchema = new mongoose.Schema({
    platform: {
        type: String,
        required: true,
        enum: ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'RapidAPI']
    },
    apiKey: {
        type: String,
        required: true // 'PUBLIC_SCRAPER' for anonymous scrapes
    },
    accountId: {
        type: String,
        required: false
    },
    url: {
        type: String,
        required: false
    },
    followers: {
        type: Number,
        default: 0
    },
    growth: {
        type: Number,
        default: 0
    },
    engagement: {
        type: Number,
        default: 0
    },
    ctr: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const SocialCredential = mongoose.model('SocialCredential', socialCredentialSchema);
export default SocialCredential;
