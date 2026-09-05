import { useAuthStore } from '../store/authStore';
import { ROLES } from '../features/users/roleConfig';

/**
 * Hook to check if current user has specific permissions.
 * 
 * Usage:
 *   const { hasPermission, hasAnyPermission, isAdmin } = usePermission();
 *   if (hasPermission('inventory.adjust')) { ... }
 */
export const usePermission = () => {
    const user = useAuthStore((state) => state.user);

    if (!user) {
        return {
            hasPermission: () => false,
            hasAnyPermission: () => false,
            isAdmin: false,
            permissions: [],
        };
    }

    // Get default permissions for the user's role
    const roleConfig = ROLES.find((r) => r.value === user.role);
    const rolePermissions = roleConfig ? roleConfig.permissions : [];
    
    // User-specific permission overrides (from backend)
    const userPermissions = user.permissions || [];

    // Merge permissions
    const allPermissions = [...new Set([...rolePermissions, ...userPermissions])];

    const hasPermission = (permissionCode) => {
        if (allPermissions.includes('*') || allPermissions.includes('all')) return true;
        return allPermissions.includes(permissionCode);
    };

    const hasAnyPermission = (permissionCodes) => {
        if (allPermissions.includes('*') || allPermissions.includes('all')) return true;
        return permissionCodes.some((code) => allPermissions.includes(code));
    };

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';

    return {
        hasPermission,
        hasAnyPermission,
        isAdmin,
        permissions: allPermissions,
        user,
    };
};
