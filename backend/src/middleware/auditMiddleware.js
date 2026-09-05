import { createAuditLog } from '../utils/auditLogger.js';

/**
 * Middleware to simple audit log an action (e.g. Export, View)
 * For complex mutations (Create/Update), it's better to use createAuditLog inside the controller.
 */
export const auditAction = (module, action, description) => (req, res, next) => {
    // We log after the response is sent to ensure the action was successful
    res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            createAuditLog({
                action,
                module,
                description: description || `${action} action performed on ${module}`,
                req
            });
        }
    });
    next();
};
