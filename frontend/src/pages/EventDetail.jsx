import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { eventAPI, reservationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function EventDetail() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const [event, setEvent] = useState(null);
  const [form, setForm] = useState({ participant_count: 1, reservation_date: '', reservation_time: '' });

  useEffect(() => {
    eventAPI.getById(id).then(r => {
      setEvent(r.data);
      setForm(f => ({ ...f, reservation_date: r.data.event_date, reservation_time: r.data.event_time }));
    }).catch(() => {});
  }, [id]);

  const handleAddToCart = (e) => {
    e.preventDefault();
    if (remaining < form.participant_count) {
      toast.error('Yetersiz kontenjan.');
      return;
    }
    
    addToCart({
      item_type: 'event',
      item_id: event.event_id,
      title: event.title,
      price: event.price,
      quantity: form.participant_count,
      max_quantity: remaining,
    });
    toast.success('Biletler sepete eklendi!');
  };

  if (!event) return <div className="container py-5 text-center"><div className="spinner-border"></div></div>;

  const remaining = event.capacity - event.current_registrations;
  const occupancy = ((event.current_registrations / event.capacity) * 100).toFixed(0);

  return (
    <div className="container py-4">
      <div className="row g-4">
        <div className="col-md-7">
          <h2 className="fw-bold">{event.title}</h2>
          <p className="text-muted">{event.organizer?.full_name || 'Galeri Yöneticisi'} tarafından organize edildi</p>
          <p>{event.description}</p>
          <div className="row g-3 mt-3">
            <div className="col-6"><div className="p-3 bg-light rounded">📅 <strong>Tarih:</strong> {new Date(event.event_date).toLocaleDateString('tr-TR')}</div></div>
            <div className="col-6"><div className="p-3 bg-light rounded">⏰ <strong>Saat:</strong> {event.event_time}</div></div>
            <div className="col-6"><div className="p-3 bg-light rounded">⏱️ <strong>Süre:</strong> {event.duration_minutes} dk</div></div>
            <div className="col-6"><div className="p-3 bg-light rounded">📍 <strong>Konum:</strong> {event.location}</div></div>
          </div>
          <div className="mt-3">
            <span className="fs-4 fw-bold text-success">{parseFloat(event.price) === 0 ? 'Ücretsiz' : `${parseFloat(event.price).toLocaleString('tr-TR')} ₺`}</span>
          </div>
          {/* Doluluk */}
          <div className="mt-3">
            <div className="d-flex justify-content-between">
              <span>Kapasite: {event.capacity}</span>
              <span>Kayıtlı: {event.current_registrations}</span>
              <span>Kalan: {remaining}</span>
            </div>
            <div className="progress mt-1" style={{ height: '12px' }}>
              <div className={`progress-bar ${parseInt(occupancy) > 80 ? 'bg-danger' : 'bg-success'}`} style={{ width: `${occupancy}%` }}></div>
            </div>
          </div>
          {event.avg_rating && (
            <p className="mt-3">⭐ {event.avg_rating} / 5 ({event.review_count} değerlendirme)</p>
          )}

          {/* Yorumlar */}
          {event.reviews && event.reviews.length > 0 && (
            <div className="mt-4">
              <h5>Yorumlar</h5>
              {event.reviews.map(r => (
                <div key={r.review_id} className="card mb-2 border-0 shadow-sm">
                  <div className="card-body py-2">
                    <strong>{r.user?.username}</strong> — {'⭐'.repeat(r.rating)}
                    <p className="mb-0 small">{r.comment}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rezervasyon Formu */}
        <div className="col-md-5">
          {isAuthenticated && remaining > 0 ? (
            <div className="card shadow border-0">
              <div className="card-body p-4">
                <h4 className="fw-bold mb-3">🎟️ Bilet Al / Sepete Ekle</h4>
                <form onSubmit={handleAddToCart}>
                  <div className="mb-3">
                    <label className="form-label">Katılımcı Sayısı</label>
                    <input type="number" className="form-control" min="1" max={remaining}
                      value={form.participant_count}
                      onChange={e => setForm({ ...form, participant_count: parseInt(e.target.value) })} />
                    <small className="text-muted">Maksimum: {remaining}</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Tarih</label>
                    <input type="date" className="form-control" value={form.reservation_date}
                      onChange={e => setForm({ ...form, reservation_date: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Saat</label>
                    <input type="time" className="form-control" value={form.reservation_time}
                      onChange={e => setForm({ ...form, reservation_time: e.target.value })} required />
                  </div>
                  <div className="bg-light p-3 rounded mb-3">
                    <strong>Toplam: </strong>
                    <span className="text-success fw-bold">
                      {(parseFloat(event.price) * form.participant_count).toLocaleString('tr-TR')} ₺
                    </span>
                  </div>
                  <button className="btn btn-dark w-100">Sepete Ekle</button>
                </form>
              </div>
            </div>
          ) : !isAuthenticated ? (
            <div className="alert alert-warning">Rezervasyon yapmak için giriş yapmalısınız.</div>
          ) : (
            <div className="alert alert-danger">Bu etkinlik için yer kalmamıştır.</div>
          )}
        </div>
      </div>
    </div>
  );
}
