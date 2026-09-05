/**
 * Certification Expiry Alert Service
 * Runs a daily cron job at 08:00 AM to check certification expiry dates.
 * Emits WebSocket alerts to all connected dashboard users.
 */
import cron from 'node-cron';
import Certification from '../models/Certification.js';

let _io = null;

export const initCertificationAlerts = (io) => {
    _io = io;

    // Run daily at 08:00 AM
    cron.schedule('0 8 * * *', async () => {
        console.log('[CertAlert] Running daily certification expiry check...');
        await checkCertifications();
    });

    console.log('[CertAlert] Certification alert service initialised — runs daily at 08:00 AM');
};

export const checkCertifications = async () => {
    try {
        const today = new Date();
        const certs = await Certification.find({ status: 'active' });

        let alertCount = 0;
        for (const cert of certs) {
            if (!cert.validUntil) continue;

            const daysLeft = Math.floor(
                (new Date(cert.validUntil) - today) / (1000 * 60 * 60 * 24)
            );

            if (daysLeft <= cert.renewalReminder) {
                const alert = {
                    type:      'certification_alert',
                    certId:    cert._id,
                    name:      cert.name,
                    market:    cert.market || 'Global',
                    certBody:  cert.certificationBody,
                    certNo:    cert.certificateNumber,
                    daysLeft,
                    expiresOn: cert.validUntil,
                    severity:  daysLeft <= 30 ? 'critical' : 'warning',
                    message:   `${cert.name} (${cert.market || 'Global'}) expires in ${daysLeft} day(s) on ${new Date(cert.validUntil).toLocaleDateString('en-GB')}`,
                };

                if (_io) {
                    _io.emit('certification_alert', alert);
                    alertCount++;
                }
                console.log(`[CertAlert] ${alert.severity.toUpperCase()}: ${alert.message}`);
            }
        }

        if (alertCount === 0) {
            console.log('[CertAlert] All certifications are within safe renewal window.');
        }
    } catch (err) {
        console.error('[CertAlert] Error checking certifications:', err.message);
    }
};
