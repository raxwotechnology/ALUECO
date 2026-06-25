import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';

export default function ProtectedRoute({ children, allowedRoles, requiredPermission, requiredAnyPermission, excludeRoles }) {
    const { isAuthenticated, user } = useAuthStore();
    const { hasPermission, hasAnyPermission } = usePermission();
    const location = useLocation();

    if (!isAuthenticated) {
        // Save attempted location so we can redirect back after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Excluded roles guard
    if (excludeRoles && excludeRoles.includes(user?.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    // Permission-based guard (AND logic)
    if (requiredPermission && !hasPermission(requiredPermission)) {
        return <Navigate to="/unauthorized" replace />;
    }

    // Permission-based guard (OR logic)
    if (requiredAnyPermission && !hasAnyPermission(requiredAnyPermission)) {
        return <Navigate to="/unauthorized" replace />;
    }

    // Legacy Role-based guard
    if (allowedRoles) {
        if (!allowedRoles.includes(user?.role)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
}