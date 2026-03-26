import { Navigate } from "react-router-dom";
import { useAuth, type UserRole } from "../contexts/AuthContext";

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user?.role)) {
    const redirectMap: Record<string, string> = {
      admin: "/admin",
      tutor: "/programme-manager",
      programme_manager: "/programme-manager",
      scholar: "/dashboard",
    };
    return <Navigate to={redirectMap[user.role] || "/dashboard"} replace />;
  }

  return <>{children}</>;
}
