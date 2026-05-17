import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { favoriteAPI } from '../services/api';

export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    favoriteAPI.getAll().then(r => setFavorites(r.data)).catch(() => {});
  }, []);

  const removeFav = async (artworkId) => {
    try {
      await favoriteAPI.remove(artworkId);
      setFavorites(prev => prev.filter(f => f.artwork_id !== artworkId));
      setMsg('Favorilerden çıkarıldı');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Hata');
    }
  };

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4">❤️ Favorilerim</h2>
      {msg && <div className="alert alert-info">{msg}</div>}
      {favorites.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted fs-5">Henüz favori eklemediniz.</p>
          <Link to="/artworks" className="btn btn-dark">Eserleri Keşfet</Link>
        </div>
      ) : (
        <div className="row g-4">
          {favorites.map(f => (
            <div key={f.favorite_id} className="col-md-4 col-sm-6">
              <div className="card h-100 shadow-sm border-0">
                <div className="d-flex align-items-center justify-content-center" style={{
                  height: '180px', background: `hsl(${f.artwork?.artwork_id * 45}, 35%, 85%)`
                }}>
                  <span style={{ fontSize: '3rem' }}>🖼️</span>
                </div>
                <div className="card-body">
                  <h6 className="fw-semibold">{f.artwork?.title}</h6>
                  <p className="small text-muted">{f.artwork?.artist?.name}</p>
                  <span className="fw-bold text-success">{parseFloat(f.artwork?.price || 0).toLocaleString('tr-TR')} ₺</span>
                  <div className="d-flex gap-2 mt-2">
                    <Link to={`/artworks/${f.artwork_id}`} className="btn btn-sm btn-outline-dark">Detay</Link>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => removeFav(f.artwork_id)}>Çıkar</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
