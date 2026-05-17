import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { eventAPI } from '../services/api';

export default function EventList() {
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page')) || 1;
  const filter = searchParams.get('filter') || '';

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (filter) params.filter = filter;
    eventAPI.getAll(params).then(r => {
      setEvents(r.data.events || []);
      setPagination(r.data.pagination || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, filter]);

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4">📅 Etkinlikler & Atölyeler</h2>
      <div className="d-flex gap-2 mb-4">
        <button className={`btn ${!filter ? 'btn-dark' : 'btn-outline-dark'}`}
          onClick={() => { const p = new URLSearchParams(searchParams); p.delete('filter'); p.set('page', '1'); setSearchParams(p); }}>
          Tümü
        </button>
        <button className={`btn ${filter === 'upcoming' ? 'btn-dark' : 'btn-outline-dark'}`}
          onClick={() => { const p = new URLSearchParams(searchParams); p.set('filter', 'upcoming'); p.set('page', '1'); setSearchParams(p); }}>
          Yaklaşan
        </button>
      </div>

      <div className="row g-4">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-dark"></div>
          </div>
        ) : (
          <>
            {events.length === 0 && <p className="text-muted">Etkinlik bulunamadı.</p>}
            {events.map(e => {
          const remaining = e.capacity - e.current_registrations;
          const occupancy = ((e.current_registrations / e.capacity) * 100).toFixed(0);
          return (
            <div key={e.event_id} className="col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title fw-semibold">{e.title}</h5>
                    <span className="badge bg-primary">{e.event_time}</span>
                  </div>
                  <p className="small text-muted mb-2">{e.description?.substring(0, 80)}...</p>
                  <p className="mb-1">📅 {new Date(e.event_date).toLocaleDateString('tr-TR')}</p>
                  <p className="mb-1">📍 {e.location}</p>
                  <p className="mb-2">⏱️ {e.duration_minutes} dakika</p>
                  {/* Doluluk göstergesi */}
                  <div className="mb-2">
                    <div className="d-flex justify-content-between small">
                      <span>Doluluk: %{occupancy}</span>
                      <span>{remaining} kişilik yer</span>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div className={`progress-bar ${parseInt(occupancy) > 80 ? 'bg-danger' : 'bg-success'}`}
                        style={{ width: `${occupancy}%` }}></div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <span className="fw-bold text-success">
                      {parseFloat(e.price) === 0 ? 'Ücretsiz' : `${parseFloat(e.price).toLocaleString('tr-TR')} ₺`}
                    </span>
                    <Link to={`/events/${e.event_id}`} className="btn btn-sm btn-dark">Detay & Rezervasyon</Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </>
      )}
      </div>

      {!loading && pagination.totalPages > 1 && (
        <nav className="mt-4">
          <ul className="pagination justify-content-center">
            {[...Array(pagination.totalPages)].map((_, i) => (
              <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.set('page', String(i + 1));
                  setSearchParams(p);
                }}>{i + 1}</button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
