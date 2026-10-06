import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

/** Also performs the post-login redirect, back to the page the user originally requested. */
export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    const from = location.state?.from;
    const next = from ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}` : "/";
    return <Navigate to={next} replace />;
  }

  return <Outlet />;
}
