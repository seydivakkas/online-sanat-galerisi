import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, isManager, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow">
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          <span className="text-warning">🎨</span> Sanat Galerisi
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item"><Link className="nav-link" to="/artworks">Eserler</Link></li>
            <li className="nav-item"><Link className="nav-link" to="/events">Etkinlikler</Link></li>
            {isAuthenticated && (
              <>
                <li className="nav-item"><Link className="nav-link" to="/favorites">Favorilerim</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/orders">Siparişlerim</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/reservations">Rezervasyonlarım</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/compare">Karşılaştır</Link></li>
                <li className="nav-item"><Link className="nav-link" to="/support">Destek</Link></li>
              </>
            )}
            {(isAdmin || isManager) && (
              <li className="nav-item"><Link className="nav-link text-warning" to="/admin">📋 Panel</Link></li>
            )}
            <li className="nav-item">
              <Link className="nav-link" to="/checkout">
                🛒 {itemCount > 0 && <span className="badge bg-danger rounded-pill">{itemCount}</span>}
              </Link>
            </li>
          </ul>
          <div className="d-flex align-items-center gap-2">
            {isAuthenticated ? (
              <>
                <Link to="/profile" className="btn btn-outline-light btn-sm">{user.username}</Link>
                <button className="btn btn-outline-danger btn-sm" onClick={handleLogout}>Çıkış</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline-light btn-sm">Giriş</Link>
                <Link to="/register" className="btn btn-warning btn-sm">Kayıt Ol</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
