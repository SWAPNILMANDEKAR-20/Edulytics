import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface RoleGuardProps {
  allowedRoles: ('student' | 'professor')[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const location = useLocation();
  const currentUserStr = localStorage.getItem('currentUser');
  
  // Guard unauthenticated
  if (!currentUserStr) {
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const user = JSON.parse(currentUserStr);
  
  // Guard unauthorized roles
  if (!allowedRoles.includes(user.role)) {
    // Show user-friendly overlay or simple native notification warning
    setTimeout(() => {
      alert(`Role Protection Guard: You do not have permissions to access this segment. Redirected to your authorized workspace.`);
    }, 100);
    
    return <Navigate to={user.role === 'student' ? '/student/dashboard' : '/professor/dashboard'} replace />;
  }

  return <>{children}</>;
}
