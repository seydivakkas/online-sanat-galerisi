import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { artworkAPI, artistAPI } from '../services/api';

export default function ArtworkList() {
  const [artworks, setArtworks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page')) || 1;
  const categoryId = searchParams.get('category_id') || '';
  const search = searchParams.get('search') || '';
  const minPrice = searchParams.get('min_price') || '';
  const maxPrice = searchParams.get('max_price') || '';

  useEffect(() => {
    setLoading(true);
    const params = { page, limit: 12 };
    if (categoryId) params.category_id = categoryId;
    if (search) params.search = search;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;

    artworkAPI.getAll(params).then(r => {
      setArtworks(r.data.artworks || []);
      setPagination(r.data.pagination || {});
    }).catch(() => {}).finally(() => setLoading(false));
  }, [page, categoryId, search, minPrice, maxPrice]);

  useEffect(() => {
    artistAPI.getCategories()
      .then(r => setCategories(r.data || [])).catch(() => {});
  }, []);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4">🖼️ Eser Galerisi</h2>
      {/* Filtreler */}
      <div className="row g-3 mb-4 p-3 bg-light rounded">
        <div className="col-md-3">
          <input type="text" className="form-control" placeholder="Eser ara..."
            value={search} onChange={e => updateFilter('search', e.target.value)} />
        </div>
        <div className="col-md-3">
          <select className="form-select" value={categoryId} onChange={e => updateFilter('category_id', e.target.value)}>
            <option value="">Tüm Kategoriler</option>
            {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
          </select>
        </div>
        <div className="col-md-2">
          <input type="number" className="form-control" placeholder="Min ₺"
            value={minPrice} onChange={e => updateFilter('min_price', e.target.value)} />
        </div>
        <div className="col-md-2">
          <input type="number" className="form-control" placeholder="Max ₺"
            value={maxPrice} onChange={e => updateFilter('max_price', e.target.value)} />
        </div>
        <div className="col-md-2">
          <button className="btn btn-outline-secondary w-100" onClick={() => setSearchParams({})}>Temizle</button>
        </div>
      </div>

      {/* Eser Listesi */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-dark"></div>
        </div>
      ) : (
        <div className="row g-4">
          {artworks.length === 0 && <p className="text-muted">Eser bulunamadı.</p>}
          {artworks.map(a => (
          <div key={a.artwork_id} className="col-lg-3 col-md-4 col-sm-6">
            <div className="card h-100 shadow-sm border-0 artwork-card">
              <div className="d-flex align-items-center justify-content-center" style={{
                height: '200px', background: `hsl(${a.artwork_id * 45}, 35%, 85%)`, borderRadius: '0.375rem 0.375rem 0 0'
              }}>
                <span style={{ fontSize: '3rem' }}>🖼️</span>
              </div>
              <div className="card-body">
                <h6 className="card-title fw-semibold">{a.title}</h6>
                <p className="small text-muted mb-1">{a.artist?.name}</p>
                <span className="badge bg-secondary mb-2">{a.category?.name}</span>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-success">{parseFloat(a.price).toLocaleString('tr-TR')} ₺</span>
                  <Link to={`/artworks/${a.artwork_id}`} className="btn btn-sm btn-outline-dark">Detay</Link>
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <nav className="mt-4">
          <ul className="pagination justify-content-center">
            {[...Array(pagination.totalPages)].map((_, i) => (
              <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => {
                  const params = new URLSearchParams(searchParams);
                  params.set('page', String(i + 1));
                  setSearchParams(params);
                }}>{i + 1}</button>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
