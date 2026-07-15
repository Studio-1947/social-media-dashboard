import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { type ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;
    /** Sends a signed-in non-admin back to the dashboard rather than the admin
     * panel. The real gate is server-side (every /api/admin route re-checks the
     * caller's current role) — this is just so a member doesn't land on a page
     * that will 403 every request it tries to make. */
    requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin }: ProtectedRouteProps) => {
    const { isAuthenticated, user } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (requireAdmin && user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};
