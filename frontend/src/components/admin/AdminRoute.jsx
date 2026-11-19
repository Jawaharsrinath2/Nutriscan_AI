import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { PATHS } from "../../lib/paths";

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-sm font-medium">
        Verifying permissions…
      </div>
    );
  }

  if (!user) {
    return <Navigate to={PATHS.login} replace />;
  }

  if (!isAdmin) {
    return <Navigate to={PATHS.dashboard} replace />;
  }

  return children;
}
