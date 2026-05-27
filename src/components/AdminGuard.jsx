import { Navigate } from "react-router-dom";

export default function AdminGuard({ children }) {
  const authed = sessionStorage.getItem("supernova_admin") === "true";
  if (!authed) return <Navigate to="/admin/login" replace />;
  return children;
}
