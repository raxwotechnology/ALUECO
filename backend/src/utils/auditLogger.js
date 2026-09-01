import AuditLog from '../models/AuditLog.js';

/**
 * Utility to create an audit log entry
 * @param {Object} params - { action, module, documentId, documentCode, description, changes, previousData, req }
 */
export const createAuditLog = async ({
    action,
    module,
    documentId,
    documentCode,
    description,
    changes,
    previousData,
    req
}) => {
    try {
        await AuditLog.create({
            action,
            module,
            documentId,
            documentCode,
            description,
            changes,
            previousData,
            performedBy: req.user._id,
            ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
    }
};
