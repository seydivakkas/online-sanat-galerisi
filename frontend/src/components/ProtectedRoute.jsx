import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, adminOnly = false, roles = [] }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Eski adminOnly uyumluluğu
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" replace />;

  // Yeni roles tabanlı kontrol
  if (roles.length > 0 && !roles.includes(user?.role)) return <Navigate to="/" replace />;

  return children;
}
