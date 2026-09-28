import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // If not logged in at all, layout will usually handle it, but fallback to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If logged in but not an admin, redirect them to the regular dashboard
  if (!isAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <>{children}</>;
};
