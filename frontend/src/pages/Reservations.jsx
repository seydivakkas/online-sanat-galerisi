import { useState, useEffect } from 'react';
import { reservationAPI } from '../services/api';

export default function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    reservationAPI.getAll().then(r => setReservations(r.data)).catch(() => {});
  }, []);

  const cancelReservation = async (id) => {
    if (!confirm('Bu rezervasyonu iptal etmek istediğinize emin misiniz?')) return;
    try {
      await reservationAPI.cancel(id);
      setReservations(prev => prev.map(r =>
        r.reservation_id === id ? { ...r, status: 'cancelled' } : r
      ));
      setMsg('Rezervasyon iptal edildi');
      setTimeout(() => setMsg(''), 2000);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Hata');
    }
  };

  const statusBadge = (status) => {
    const map = { pending: 'bg-warning', confirmed: 'bg-success', cancelled: 'bg-danger' };
    const labels = { pending: 'Beklemede', confirmed: 'Onaylandı', cancelled: 'İptal Edildi' };
    return <span className={`badge ${map[status]}`}>{labels[status]}</span>;
  };

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4">🎟️ Rezervasyonlarım</h2>
      {msg && <div className="alert alert-info">{msg}</div>}
      {reservations.length === 0 ? (
        <p className="text-muted">Henüz rezervasyonunuz yok.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>Etkinlik</th>
                <th>Tarih</th>
                <th>Saat</th>
                <th>Katılımcı</th>
                <th>Durum</th>
                <th>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr key={r.reservation_id}>
                  <td className="fw-semibold">{r.event?.title}</td>
                  <td>{new Date(r.reservation_date).toLocaleDateString('tr-TR')}</td>
                  <td>{r.reservation_time}</td>
                  <td>{r.participant_count} kişi</td>
                  <td>{statusBadge(r.status)}</td>
                  <td>
                    {r.status !== 'cancelled' && (
                      <button className="btn btn-sm btn-outline-danger" onClick={() => cancelReservation(r.reservation_id)}>
                        İptal Et
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
