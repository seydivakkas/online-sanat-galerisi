import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ═══════════════════════════════════════════════
//  ANA BİLEŞEN
// ═══════════════════════════════════════════════
export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('dashboard');

  const allTabs = [
    { key: 'dashboard', label: '📊 Dashboard', roles: ['admin', 'gallery_manager'] },
    { key: 'users', label: '👥 Kullanıcılar', roles: ['admin'] },
    { key: 'artworks', label: '🖼️ Eserler', roles: ['admin', 'gallery_manager'] },
    { key: 'events', label: '📅 Etkinlikler', roles: ['admin', 'gallery_manager'] },
    { key: 'orders', label: '📦 Siparişler', roles: ['admin', 'gallery_manager'] },
    { key: 'reviews', label: '💬 Yorumlar', roles: ['admin', 'gallery_manager'] },
    { key: 'coupons', label: '🎟️ Kuponlar', roles: ['admin'] },
  ];

  const visibleTabs = allTabs.filter(t => isAdmin || t.roles.includes('gallery_manager'));

  return (
    <div className="container-fluid py-4 px-4">
      <h2 className="fw-bold mb-4">📋 Yönetim Paneli</h2>
      <ul className="nav nav-tabs mb-4">
        {visibleTabs.map(t => (
          <li key={t.key} className="nav-item">
            <button className={`nav-link ${tab === t.key ? 'active fw-semibold' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
          </li>
        ))}
      </ul>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'users' && isAdmin && <UsersTab />}
      {tab === 'artworks' && <ArtworksTab />}
      {tab === 'events' && <EventsTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'coupons' && isAdmin && <CouponsTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════
//  DASHBOARD SEKMESİ
// ═══════════════════════════════════════════════
function DashboardTab() {
  const [summary, setSummary] = useState(null);
  const [artworkReports, setArtworkReports] = useState([]);
  const [eventReports, setEventReports] = useState([]);

  useEffect(() => {
    adminAPI.getSummary().then(r => setSummary(r.data)).catch(() => {});
    adminAPI.getArtworkReports().then(r => setArtworkReports(r.data)).catch(() => {});
    adminAPI.getEventReports().then(r => setEventReports(r.data)).catch(() => {});
  }, []);

  if (!summary) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  const artworkChartData = {
    labels: artworkReports.slice(0, 10).map(a => a.title?.substring(0, 15)),
    datasets: [
      { label: 'Görüntülenme', data: artworkReports.slice(0, 10).map(a => a.view_count), backgroundColor: 'rgba(54, 162, 235, 0.7)' },
      { label: 'Favori', data: artworkReports.slice(0, 10).map(a => a.like_count), backgroundColor: 'rgba(255, 99, 132, 0.7)' },
    ]
  };
  const eventChartData = {
    labels: eventReports.map(e => e.title?.substring(0, 15)),
    datasets: [{ data: eventReports.map(e => e.current_registrations), backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#7BC0A0', '#E8634F', '#8FBCD4'] }]
  };

  return (
    <>
      <div className="row g-3 mb-4">
        {[
          { title: 'Kullanıcı', value: summary.totalUsers, icon: '👥', color: '#0d6efd' },
          { title: 'Eser', value: summary.totalArtworks, icon: '🖼️', color: '#6f42c1' },
          { title: 'Sipariş', value: summary.totalOrders, icon: '📦', color: '#198754' },
          { title: 'Etkinlik', value: summary.totalEvents, icon: '📅', color: '#fd7e14' },
          { title: 'Gelir', value: `${parseFloat(summary.monthlyRevenue).toLocaleString('tr-TR')} ₺`, icon: '💰', color: '#dc3545' },
        ].map((c, i) => (
          <div key={i} className="col">
            <div className="card border-0 shadow-sm text-white" style={{ background: c.color }}>
              <div className="card-body text-center py-3">
                <div className="fs-3">{c.icon}</div>
                <h4 className="fw-bold mb-0">{c.value}</h4>
                <small>{c.title}</small>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="row g-4 mb-4">
        <div className="col-md-8">
          <div className="card shadow-sm border-0"><div className="card-body">
            <h5 className="fw-bold">Eser İstatistikleri</h5>
            <Bar data={artworkChartData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
          </div></div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm border-0"><div className="card-body">
            <h5 className="fw-bold">Etkinlik Kayıtları</h5>
            <Doughnut data={eventChartData} />
          </div></div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════
//  KULLANICILAR SEKMESİ (Admin only)
// ═══════════════════════════════════════════════
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminAPI.getUsers().then(r => setUsers(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleStatus = async (id, current) => {
    try {
      await adminAPI.updateUserStatus(id, !current);
      toast.success(current ? 'Kullanıcı donduruldu' : 'Kullanıcı aktifleştirildi');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const changeRole = async (id, role) => {
    try {
      await adminAPI.updateUserRole(id, role);
      toast.success('Rol güncellendi');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    try {
      await adminAPI.deleteUser(id);
      toast.success('Kullanıcı silindi');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <div className="table-responsive">
      <table className="table table-hover table-bordered align-middle">
        <thead className="table-dark">
          <tr><th>ID</th><th>Kullanıcı</th><th>E-posta</th><th>Ad Soyad</th><th>Rol</th><th>Durum</th><th>İşlemler</th></tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.user_id}>
              <td>{u.user_id}</td>
              <td className="fw-semibold">{u.username}</td>
              <td>{u.email}</td>
              <td>{u.full_name}</td>
              <td>
                <select className="form-select form-select-sm" value={u.role} onChange={e => changeRole(u.user_id, e.target.value)}>
                  <option value="customer">Customer</option>
                  <option value="gallery_manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>
                <span className={`badge ${u.is_active !== false ? 'bg-success' : 'bg-danger'}`}>
                  {u.is_active !== false ? 'Aktif' : 'Dondurulmuş'}
                </span>
              </td>
              <td>
                <div className="btn-group btn-group-sm">
                  <button className={`btn ${u.is_active !== false ? 'btn-outline-warning' : 'btn-outline-success'}`}
                    onClick={() => toggleStatus(u.user_id, u.is_active !== false)}>
                    {u.is_active !== false ? '🔒 Dondur' : '🔓 Aç'}
                  </button>
                  <button className="btn btn-outline-danger" onClick={() => deleteUser(u.user_id)}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  ESER YÖNETİMİ SEKMESİ
// ═══════════════════════════════════════════════
function ArtworksTab() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = () => {
    setLoading(true);
    adminAPI.getArtworks().then(r => setArtworks(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startEdit = (a) => { setEditId(a.artwork_id); setEditForm({ title: a.title, price: a.price, stock_quantity: a.stock_quantity, is_available: a.is_available }); };
  const cancelEdit = () => { setEditId(null); setEditForm({}); };
  const saveEdit = async (id) => {
    try {
      await adminAPI.updateArtwork(id, editForm);
      toast.success('Eser güncellendi');
      cancelEdit(); load();
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };
  const deleteArtwork = async (id) => {
    if (!window.confirm('Bu eseri silmek istediğinize emin misiniz?')) return;
    try { await adminAPI.deleteArtwork(id); toast.success('Eser silindi'); load(); } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <div className="table-responsive">
      <table className="table table-hover table-bordered align-middle">
        <thead className="table-dark">
          <tr><th>ID</th><th>Eser</th><th>Sanatçı</th><th>Kategori</th><th>Fiyat</th><th>Stok</th><th>Aktif</th><th>İşlemler</th></tr>
        </thead>
        <tbody>
          {artworks.map(a => (
            <tr key={a.artwork_id}>
              <td>{a.artwork_id}</td>
              <td>
                {editId === a.artwork_id ? (
                  <input className="form-control form-control-sm" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                ) : <span className="fw-semibold">{a.title}</span>}
              </td>
              <td>{a.artist?.name || '-'}</td>
              <td><span className="badge bg-secondary">{a.category?.name || '-'}</span></td>
              <td>
                {editId === a.artwork_id ? (
                  <input type="number" className="form-control form-control-sm" style={{width:'100px'}} value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} />
                ) : <span className="text-success fw-bold">{parseFloat(a.price).toLocaleString('tr-TR')} ₺</span>}
              </td>
              <td>
                {editId === a.artwork_id ? (
                  <input type="number" className="form-control form-control-sm" style={{width:'70px'}} value={editForm.stock_quantity} onChange={e => setEditForm({...editForm, stock_quantity: parseInt(e.target.value)})} />
                ) : a.stock_quantity}
              </td>
              <td>
                {editId === a.artwork_id ? (
                  <input type="checkbox" className="form-check-input" checked={editForm.is_available} onChange={e => setEditForm({...editForm, is_available: e.target.checked})} />
                ) : <span className={`badge ${a.is_available !== false ? 'bg-success' : 'bg-danger'}`}>{a.is_available !== false ? 'Evet' : 'Hayır'}</span>}
              </td>
              <td>
                {editId === a.artwork_id ? (
                  <div className="btn-group btn-group-sm">
                    <button className="btn btn-success" onClick={() => saveEdit(a.artwork_id)}>✅</button>
                    <button className="btn btn-secondary" onClick={cancelEdit}>❌</button>
                  </div>
                ) : (
                  <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-primary" onClick={() => startEdit(a)}>✏️</button>
                    <button className="btn btn-outline-danger" onClick={() => deleteArtwork(a.artwork_id)}>🗑️</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  ETKİNLİK YÖNETİMİ SEKMESİ
// ═══════════════════════════════════════════════
function EventsTab() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_date: '', event_time: '', duration_minutes: 120, capacity: 20, price: 0, location: '' });

  const load = () => {
    setLoading(true);
    adminAPI.getEvents().then(r => setEvents(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const createEvent = async (e) => {
    e.preventDefault();
    try { await adminAPI.createEvent(form); toast.success('Etkinlik oluşturuldu'); setShowForm(false); setForm({ title: '', description: '', event_date: '', event_time: '', duration_minutes: 120, capacity: 20, price: 0, location: '' }); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const toggleActive = async (ev) => {
    try { await adminAPI.updateEvent(ev.event_id, { is_active: !ev.is_active }); toast.success('Güncellendi'); load(); }
    catch (err) { toast.error('Hata'); }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Bu etkinliği silmek istediğinize emin misiniz?')) return;
    try { await adminAPI.deleteEvent(id); toast.success('Etkinlik silindi'); load(); } catch (err) { toast.error('Hata'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <>
      <button className="btn btn-dark mb-3" onClick={() => setShowForm(!showForm)}>
        {showForm ? '❌ İptal' : '➕ Yeni Etkinlik'}
      </button>

      {showForm && (
        <form onSubmit={createEvent} className="card border-0 shadow-sm p-3 mb-4">
          <div className="row g-2">
            <div className="col-md-6"><input required className="form-control" placeholder="Başlık" value={form.title} onChange={e => setForm({...form, title: e.target.value})} /></div>
            <div className="col-md-3"><input required type="date" className="form-control" value={form.event_date} onChange={e => setForm({...form, event_date: e.target.value})} /></div>
            <div className="col-md-3"><input required type="time" className="form-control" value={form.event_time} onChange={e => setForm({...form, event_time: e.target.value})} /></div>
            <div className="col-md-12"><textarea className="form-control" rows="2" placeholder="Açıklama" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
            <div className="col-md-3"><input type="number" className="form-control" placeholder="Süre (dk)" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: parseInt(e.target.value)})} /></div>
            <div className="col-md-3"><input type="number" className="form-control" placeholder="Kapasite" value={form.capacity} onChange={e => setForm({...form, capacity: parseInt(e.target.value)})} /></div>
            <div className="col-md-3"><input type="number" className="form-control" placeholder="Fiyat ₺" value={form.price} onChange={e => setForm({...form, price: parseFloat(e.target.value)})} /></div>
            <div className="col-md-3"><input className="form-control" placeholder="Konum" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
            <div className="col-12"><button type="submit" className="btn btn-success">✅ Oluştur</button></div>
          </div>
        </form>
      )}

      <div className="table-responsive">
        <table className="table table-hover table-bordered align-middle">
          <thead className="table-dark"><tr><th>ID</th><th>Etkinlik</th><th>Tarih</th><th>Saat</th><th>Fiyat</th><th>Kayıtlı/Kapasite</th><th>Aktif</th><th>İşlemler</th></tr></thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.event_id}>
                <td>{ev.event_id}</td>
                <td className="fw-semibold">{ev.title}</td>
                <td>{ev.event_date}</td>
                <td>{ev.event_time}</td>
                <td>{parseFloat(ev.price) === 0 ? <span className="badge bg-info">Ücretsiz</span> : `${parseFloat(ev.price).toLocaleString('tr-TR')} ₺`}</td>
                <td>{ev.current_registrations}/{ev.capacity}</td>
                <td>
                  <button className={`btn btn-sm ${ev.is_active ? 'btn-success' : 'btn-secondary'}`} onClick={() => toggleActive(ev)}>
                    {ev.is_active ? '✅ Aktif' : '⏸️ Pasif'}
                  </button>
                </td>
                <td><button className="btn btn-sm btn-outline-danger" onClick={() => deleteEvent(ev.event_id)}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════
//  SİPARİŞ YÖNETİMİ SEKMESİ
// ═══════════════════════════════════════════════
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminAPI.getOrders().then(r => setOrders(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const updateStatus = async (id, status) => {
    try { await adminAPI.updateOrderStatus(id, status); toast.success('Durum güncellendi'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const statusColors = { pending: 'warning', paid: 'info', shipped: 'primary', delivered: 'success', cancelled: 'danger' };
  const statusLabels = { pending: 'Beklemede', paid: 'Ödendi', shipped: 'Kargoda', delivered: 'Teslim Edildi', cancelled: 'İptal' };

  if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <div className="table-responsive">
      <table className="table table-hover table-bordered align-middle">
        <thead className="table-dark"><tr><th>ID</th><th>Müşteri</th><th>Tutar</th><th>İndirim</th><th>Ödeme</th><th>Durum</th><th>Tarih</th><th>Güncelle</th></tr></thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.order_id}>
              <td>#{o.order_id}</td>
              <td className="fw-semibold">{o.user?.full_name || o.user?.username || '-'}</td>
              <td className="text-success fw-bold">{parseFloat(o.total_amount).toLocaleString('tr-TR')} ₺</td>
              <td>{o.discount_amount > 0 ? `${parseFloat(o.discount_amount).toLocaleString('tr-TR')} ₺` : '-'}</td>
              <td>{o.payment_method}</td>
              <td><span className={`badge bg-${statusColors[o.status]}`}>{statusLabels[o.status]}</span></td>
              <td>{new Date(o.created_at).toLocaleDateString('tr-TR')}</td>
              <td>
                <select className="form-select form-select-sm" value={o.status} onChange={e => updateStatus(o.order_id, e.target.value)}>
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  YORUM YÖNETİMİ SEKMESİ
// ═══════════════════════════════════════════════
function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);

  const load = () => {
    setLoading(true);
    adminAPI.getReviews().then(r => setReviews(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggleVerify = async (id, current) => {
    try { await adminAPI.updateReviewStatus(id, !current); toast.success(!current ? 'Onaylandı' : 'Onay kaldırıldı'); load(); }
    catch (err) { toast.error('Hata'); }
  };

  const deleteReview = async (id) => {
    if (!window.confirm('Bu yorumu silmek istediğinize emin misiniz?')) return;
    try { await adminAPI.deleteReview(id); toast.success('Yorum silindi'); load(); } catch (err) { toast.error('Hata'); }
  };

  const handleReply = async (id) => {
    if (!replyText.trim()) return toast.error('Yanıt boş olamaz');
    try {
      await adminAPI.replyReview(id, replyText);
      toast.success('Yanıt eklendi');
      setReplyText('');
      setReplyingTo(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <div className="table-responsive">
      <table className="table table-hover table-bordered align-middle">
        <thead className="table-dark"><tr><th>ID</th><th>Kullanıcı</th><th>Tür</th><th>Puan</th><th>Yorum</th><th>Onay</th><th>İşlemler</th></tr></thead>
        <tbody>
          {reviews.map(r => (
            <tr key={r.review_id}>
              <td>{r.review_id}</td>
              <td className="fw-semibold">{r.user?.full_name || r.user?.username || '-'}</td>
              <td>{r.artwork_id ? `Eser #${r.artwork_id}` : `Etkinlik #${r.event_id}`}</td>
              <td>{'⭐'.repeat(r.rating)}</td>
              <td style={{ maxWidth: '350px' }}>
                <div className="mb-2">{r.comment}</div>
                {r.replies && r.replies.length > 0 && (
                  <div className="bg-light p-2 rounded small mt-2 border-start border-3 border-warning">
                    <strong className="text-warning-emphasis">Admin Yanıtı:</strong> {r.replies[0].reply_text}
                  </div>
                )}
                {replyingTo === r.review_id && (
                  <div className="mt-2 text-end">
                    <textarea className="form-control form-control-sm mb-1" rows="2" placeholder="Yanıt yazın..." value={replyText} onChange={e => setReplyText(e.target.value)}></textarea>
                    <button className="btn btn-sm btn-success me-1" onClick={() => handleReply(r.review_id)}>Gönder</button>
                    <button className="btn btn-sm btn-secondary" onClick={() => { setReplyingTo(null); setReplyText(''); }}>İptal</button>
                  </div>
                )}
              </td>
              <td>
                <button className={`btn btn-sm ${r.is_verified ? 'btn-success' : 'btn-outline-warning'}`} onClick={() => toggleVerify(r.review_id, r.is_verified)}>
                  {r.is_verified ? '✅ Onaylı' : '⏳ Bekliyor'}
                </button>
              </td>
              <td>
                <div className="btn-group btn-group-sm">
                  {(!r.replies || r.replies.length === 0) && replyingTo !== r.review_id && (
                    <button className="btn btn-outline-primary" onClick={() => { setReplyingTo(r.review_id); setReplyText(''); }}>💬 Yanıtla</button>
                  )}
                  <button className="btn btn-outline-danger" onClick={() => deleteReview(r.review_id)}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  KUPON YÖNETİMİ SEKMESİ (Admin only)
// ═══════════════════════════════════════════════
function CouponsTab() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', discount_percent: '', discount_amount: '', valid_from: '', valid_until: '', max_uses: 100 });

  const load = () => {
    setLoading(true);
    adminAPI.getCoupons().then(r => setCoupons(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const createCoupon = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form };
      if (!data.discount_percent) delete data.discount_percent;
      if (!data.discount_amount) delete data.discount_amount;
      await adminAPI.createCoupon(data);
      toast.success('Kupon oluşturuldu');
      setShowForm(false);
      setForm({ code: '', discount_percent: '', discount_amount: '', valid_from: '', valid_until: '', max_uses: 100 });
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm('Bu kuponu silmek istediğinize emin misiniz?')) return;
    try { await adminAPI.deleteCoupon(id); toast.success('Kupon silindi'); load(); } catch (err) { toast.error('Hata'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <>
      <button className="btn btn-dark mb-3" onClick={() => setShowForm(!showForm)}>
        {showForm ? '❌ İptal' : '➕ Yeni Kupon'}
      </button>

      {showForm && (
        <form onSubmit={createCoupon} className="card border-0 shadow-sm p-3 mb-4">
          <div className="row g-2">
            <div className="col-md-3"><input required className="form-control" placeholder="Kupon Kodu" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} /></div>
            <div className="col-md-3"><input type="number" className="form-control" placeholder="İndirim %" value={form.discount_percent} onChange={e => setForm({...form, discount_percent: e.target.value, discount_amount: ''})} /></div>
            <div className="col-md-3"><input type="number" className="form-control" placeholder="İndirim ₺" value={form.discount_amount} onChange={e => setForm({...form, discount_amount: e.target.value, discount_percent: ''})} /></div>
            <div className="col-md-3"><input type="number" className="form-control" placeholder="Max Kullanım" value={form.max_uses} onChange={e => setForm({...form, max_uses: parseInt(e.target.value)})} /></div>
            <div className="col-md-4"><label className="form-label small">Başlangıç</label><input type="date" className="form-control" value={form.valid_from} onChange={e => setForm({...form, valid_from: e.target.value})} /></div>
            <div className="col-md-4"><label className="form-label small">Bitiş</label><input type="date" className="form-control" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} /></div>
            <div className="col-md-4 d-flex align-items-end"><button type="submit" className="btn btn-success w-100">✅ Oluştur</button></div>
          </div>
        </form>
      )}

      <div className="table-responsive">
        <table className="table table-hover table-bordered align-middle">
          <thead className="table-dark"><tr><th>ID</th><th>Kod</th><th>İndirim</th><th>Başlangıç</th><th>Bitiş</th><th>Kullanım</th><th>Özel</th><th>İşlem</th></tr></thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c.coupon_id}>
                <td>{c.coupon_id}</td>
                <td className="fw-bold font-monospace">{c.code}</td>
                <td>{c.discount_percent ? `%${c.discount_percent}` : `${c.discount_amount} ₺`}</td>
                <td>{c.valid_from || '-'}</td>
                <td>{c.valid_until || '-'}</td>
                <td>{c.used_count}/{c.max_uses}</td>
                <td>{c.is_user_specific ? `👤 #${c.target_user_id}` : 'Genel'}</td>
                <td><button className="btn btn-sm btn-outline-danger" onClick={() => deleteCoupon(c.coupon_id)}>🗑️</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
