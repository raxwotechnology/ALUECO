import { ROLE_PERMISSIONS } from '../utils/seedPermissions.js';

/**
 * Get the effective permissions for a user.
 * Merges the role's default permissions with any user-specific overrides.
 */
function getEffectivePermissions(user) {
    const rolePerms = ROLE_PERMISSIONS[user.role] || [];
    const userPerms = user.permissions || [];

    // If either has wildcard, user has all permissions
    if (rolePerms.includes('*') || userPerms.includes('*')) {
        return ['*'];
    }

    // Merge role-default permissions + user-specific overrides (de-dup)
    return [...new Set([...rolePerms, ...userPerms])];
}

/**
 * Check if a user has a specific permission.
 */
function hasPermission(user, permissionCode) {
    const perms = getEffectivePermissions(user);
    if (perms.includes('*')) return true;
    return perms.includes(permissionCode);
}

/**
 * Check if a user has ANY of the given permissions.
 */
function hasAnyPermission(user, permissionCodes) {
    const perms = getEffectivePermissions(user);
    if (perms.includes('*')) return true;
    return permissionCodes.some((code) => perms.includes(code));
}

/**
 * Middleware: require ALL of the given permissions.
 *
 * Usage:
 *   router.get('/payroll', protect, requirePermission('hr.payroll.view'), getPayrolls);
 *   router.post('/invoices', protect, requirePermission('invoices.create'), createInvoice);
 */
export const requirePermission = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error('Not authorized');
        }

        const allowed = requiredPermissions.every((p) => hasPermission(req.user, p));

        if (!allowed) {
            res.status(403);
            throw new Error(
                `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
            );
        }

        next();
    };
};

/**
 * Middleware: require ANY of the given permissions (OR logic).
 *
 * Usage:
 *   router.get('/reports', protect, requireAnyPermission('reports.sales', 'reports.financial'), getReports);
 */
export const requireAnyPermission = (...requiredPermissions) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error('Not authorized');
        }

        const allowed = hasAnyPermission(req.user, requiredPermissions);

        if (!allowed) {
            res.status(403);
            throw new Error(
                `Insufficient permissions. Requires one of: ${requiredPermissions.join(', ')}`
            );
        }

        next();
    };
};

// Export helper for use in controllers (non-middleware contexts)
export { getEffectivePermissions, hasPermission, hasAnyPermission };
