import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { artworkAPI, eventAPI } from '../services/api';

export default function HomePage() {
  const [artworks, setArtworks] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    artworkAPI.getAll({ limit: 6 }).then(r => setArtworks(r.data.artworks)).catch(() => {});
    eventAPI.getAll({ filter: 'upcoming', limit: 4 }).then(r => setEvents(r.data.events)).catch(() => {});
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="hero-section text-white text-center py-5" style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        minHeight: '400px', display: 'flex', alignItems: 'center'
      }}>
        <div className="container">
          <h1 className="display-3 fw-bold mb-3">🎨 Online Sanat Galerisi</h1>
          <p className="lead mb-4">Eşsiz sanat eserlerini keşfedin, atölye çalışmalarına katılın</p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/artworks" className="btn btn-warning btn-lg px-4">Eserleri İncele</Link>
            <Link to="/events" className="btn btn-outline-light btn-lg px-4">Etkinlikler</Link>
          </div>
        </div>
      </section>

      {/* Öne Çıkan Eserler */}
      <section className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold">Öne Çıkan Eserler</h2>
          <Link to="/artworks" className="btn btn-outline-dark">Tümünü Gör →</Link>
        </div>
        <div className="row g-4">
          {artworks.map(a => (
            <div key={a.artwork_id} className="col-md-4 col-sm-6">
              <div className="card h-100 shadow-sm border-0 artwork-card">
                <div className="card-img-top bg-secondary d-flex align-items-center justify-content-center" style={{ height: '220px', background: `hsl(${a.artwork_id * 60}, 40%, 85%)` }}>
                  <span style={{ fontSize: '4rem' }}>🖼️</span>
                </div>
                <div className="card-body">
                  <h5 className="card-title fw-semibold">{a.title}</h5>
                  <p className="text-muted small mb-1">{a.artist?.name || 'Bilinmeyen Sanatçı'}</p>
                  <p className="text-muted small">{a.category?.name}</p>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold text-success fs-5">{parseFloat(a.price).toLocaleString('tr-TR')} ₺</span>
                    <Link to={`/artworks/${a.artwork_id}`} className="btn btn-sm btn-outline-dark">Detay</Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Yaklaşan Etkinlikler */}
      <section className="py-5" style={{ background: '#f8f9fa' }}>
        <div className="container">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold">Yaklaşan Etkinlikler</h2>
            <Link to="/events" className="btn btn-outline-dark">Tümünü Gör →</Link>
          </div>
          <div className="row g-4">
            {events.map(e => (
              <div key={e.event_id} className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body d-flex">
                    <div className="text-center me-3 p-3 rounded" style={{ background: '#e9ecef', minWidth: '80px' }}>
                      <div className="fw-bold text-primary fs-4">{new Date(e.event_date).getDate()}</div>
                      <div className="small text-muted">{new Date(e.event_date).toLocaleDateString('tr-TR', { month: 'short' })}</div>
                    </div>
                    <div className="flex-grow-1">
                      <h5 className="fw-semibold mb-1">{e.title}</h5>
                      <p className="small text-muted mb-1">📍 {e.location} | ⏰ {e.event_time}</p>
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <span className="badge bg-info">{e.capacity - e.current_registrations} kişilik yer</span>
                        <div>
                          <span className="fw-bold text-success me-2">{parseFloat(e.price) === 0 ? 'Ücretsiz' : `${parseFloat(e.price).toLocaleString('tr-TR')} ₺`}</span>
                          <Link to={`/events/${e.event_id}`} className="btn btn-sm btn-dark">Detay</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark text-white py-4 text-center">
        <p className="mb-0">© 2026 Online Sanat Galerisi — Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}
