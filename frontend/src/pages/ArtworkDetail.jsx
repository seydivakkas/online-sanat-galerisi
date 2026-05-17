import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { artworkAPI, favoriteAPI, reviewAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function ArtworkDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [artwork, setArtwork] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isFav, setIsFav] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    artworkAPI.getById(id).then(r => setArtwork(r.data)).catch(() => {});
    artworkAPI.getReviews(id).then(r => setReviews(r.data)).catch(() => {});
    if (isAuthenticated) {
      favoriteAPI.getAll().then(r => {
        setIsFav(r.data.some(f => f.artwork_id === parseInt(id)));
      }).catch(() => {});
    }
  }, [id, isAuthenticated]);

  const toggleFav = async () => {
    try {
      if (isFav) {
        await favoriteAPI.remove(id);
        setIsFav(false);
        toast.success('Favorilerden çıkarıldı');
      } else {
        await favoriteAPI.add(parseInt(id));
        setIsFav(true);
        toast.success('Favorilere eklendi');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Hata');
    }
  };

  const handleAddToCart = () => {
    if (!artwork.is_available || artwork.stock_quantity < 1) {
      toast.error('Bu eser stokta yok');
      return;
    }
    addToCart({
      item_type: 'artwork',
      item_id: artwork.artwork_id,
      title: artwork.title,
      price: artwork.price,
      quantity: 1,
      max_quantity: artwork.stock_quantity,
      image: artwork.image_url
    });
    toast.success('Eser sepete eklendi!');
  };

  if (!artwork) return <div className="container py-5 text-center"><div className="spinner-border"></div></div>;

  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-md-6">
          <div className="d-flex align-items-center justify-content-center rounded shadow" style={{
            height: '400px', background: `hsl(${artwork.artwork_id * 60}, 40%, 85%)`
          }}>
            <span style={{ fontSize: '8rem' }}>🖼️</span>
          </div>
        </div>
        <div className="col-md-6">
          <h2 className="fw-bold">{artwork.title}</h2>
          <p className="text-muted">{artwork.artist?.name}</p>
          <span className="badge bg-secondary mb-3">{artwork.category?.name}</span>
          <p>{artwork.description}</p>
          <div className="d-flex align-items-center gap-3 mb-3">
            <span className="fs-3 fw-bold text-success">{parseFloat(artwork.price).toLocaleString('tr-TR')} ₺</span>
            <span className="badge bg-light text-dark">👁️ {artwork.view_count} görüntülenme</span>
          </div>
          <p>Stok: <strong>{artwork.stock_quantity}</strong> | Durum: <span className={`badge ${artwork.is_available ? 'bg-success' : 'bg-danger'}`}>{artwork.is_available ? 'Mevcut' : 'Tükendi'}</span></p>
          {artwork.avg_rating && (
            <p>⭐ {artwork.avg_rating} / 5 ({artwork.review_count} değerlendirme)</p>
          )}
          <div className="d-flex gap-2 mt-3">
            {isAuthenticated ? (
              <>
                <button className="btn btn-dark" onClick={handleAddToCart} disabled={!artwork.is_available || artwork.stock_quantity < 1}>
                  🛒 Sepete Ekle
                </button>
                <button className={`btn ${isFav ? 'btn-danger' : 'btn-outline-danger'}`} onClick={toggleFav}>
                  {isFav ? '💔 Favorilerden Çıkar' : '❤️ Favorilere Ekle'}
                </button>
              </>
            ) : (
              <p className="text-muted small">Satın almak ve favorilere eklemek için giriş yapmalısınız.</p>
            )}
          </div>
        </div>
      </div>

      {/* Yorumlar */}
      <div className="mt-5">
        <h4 className="fw-bold">Yorumlar ({reviews.length})</h4>
        {reviews.length === 0 && <p className="text-muted">Henüz yorum yapılmamış.</p>}
        {reviews.map(r => (
          <div key={r.review_id} className="card mb-3 border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <strong>{r.user?.username || 'Anonim'}</strong>
                <span>{'⭐'.repeat(r.rating)}</span>
              </div>
              <p className="mb-1 mt-2">{r.comment}</p>
              {r.is_verified && <span className="badge bg-success">✓ Doğrulanmış Alıcı</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
