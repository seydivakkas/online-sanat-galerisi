import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { adminAPI } from '../services/api';
import AdminCatalogManagement from './AdminCatalogManagement';
import AdminSupportManagement from './AdminSupportManagement';
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
    { key: 'artists', label: '🎨 Sanatçılar & Kategoriler', roles: ['admin', 'gallery_manager'] },
    { key: 'events', label: '📅 Etkinlikler', roles: ['admin', 'gallery_manager'] },
    { key: 'orders', label: '📦 Siparişler', roles: ['admin', 'gallery_manager'] },
    { key: 'support', label: '📨 Destek Talepleri', roles: ['admin', 'gallery_manager'] },
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
      {tab === 'artists' && <AdminCatalogManagement />}
      {tab === 'events' && <EventsTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'support' && <AdminSupportManagement />}
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
  const [showCreate, setShowCreate] = useState(false);
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [createForm, setCreateForm] = useState({
    title: '', description: '', artist_id: '', category_id: '',
    price: '0', stock_quantity: '1', image: null
  });

  const load = () => {
    setLoading(true);
    adminAPI.getArtworks().then(r => setArtworks(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);
  useEffect(() => {
    Promise.all([adminAPI.getArtists(), adminAPI.getCategories()])
      .then(([a, c]) => { setArtists(a.data || []); setCategories(c.data || []); })
      .catch(() => toast.error('Sanatçı/kategori seçenekleri alınamadı'));
  }, []);

  const createArtwork = async (e) => {
    e.preventDefault();
    const data = new FormData();
    for (const [key, value] of Object.entries(createForm)) {
      if (value !== null && value !== '') data.append(key, value);
    }
    try {
      await adminAPI.createArtwork(data);
      toast.success('Yeni eser kataloğa eklendi');
      setShowCreate(false);
      setCreateForm({ title: '', description: '', artist_id: '', category_id: '',
        price: '0', stock_quantity: '1', image: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Eser eklenemedi');
    }
  };

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
    if (!window.confirm('Eser satıştan kaldırılsın mı? Eski sipariş kayıtları korunacak.')) return;
    try { await adminAPI.deleteArtwork(id); toast.success('Eser satıştan kaldırıldı'); load(); } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <div>
      <button className="btn btn-dark mb-3" onClick={() => setShowCreate(!showCreate)}>
        {showCreate ? 'Vazgeç' : '+ Yeni Eser Ekle'}
      </button>
      {showCreate && <form onSubmit={createArtwork} className="card p-3 mb-3">
        <h5>Eser Oluştur</h5>
        <div className="row g-2">
          <div className="col-md-6"><label className="form-label">Başlık</label>
            <input className="form-control" required maxLength={150} value={createForm.title}
              onChange={e => setCreateForm({ ...createForm, title: e.target.value })}/></div>
          <div className="col-md-3"><label className="form-label">Sanatçı</label>
            <select className="form-select" required value={createForm.artist_id}
              onChange={e => setCreateForm({ ...createForm, artist_id: e.target.value })}>
              <option value="">Seçiniz</option>
              {artists.filter(a => a.is_active).map(a => <option value={a.artist_id} key={a.artist_id}>{a.name}</option>)}
            </select></div>
          <div className="col-md-3"><label className="form-label">Kategori</label>
            <select className="form-select" required value={createForm.category_id}
              onChange={e => setCreateForm({ ...createForm, category_id: e.target.value })}>
              <option value="">Seçiniz</option>
              {categories.map(cat => <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>)}
            </select></div>
          <div className="col-md-3"><label className="form-label">Fiyat ₺</label>
            <input className="form-control" required type="number" min="0" step="0.01"
              value={createForm.price} onChange={e => setCreateForm({ ...createForm, price: e.target.value })}/></div>
          <div className="col-md-3"><label className="form-label">Stok</label>
            <input className="form-control" required type="number" min="0" step="1"
              value={createForm.stock_quantity}
              onChange={e => setCreateForm({ ...createForm, stock_quantity: e.target.value })}/></div>
          <div className="col-md-6"><label className="form-label">Görsel (en fazla 5 MB)</label>
            <input className="form-control" type="file" accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={e => setCreateForm({ ...createForm, image: e.target.files?.[0] || null })}/></div>
          <div className="col-12"><label className="form-label">Açıklama</label>
            <textarea className="form-control" rows={2} value={createForm.description}
              onChange={e => setCreateForm({ ...createForm, description: e.target.value })}/></div>
          <div className="col-12"><button className="btn btn-success" type="submit">Eseri Kaydet</button></div>
        </div>
      </form>}
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
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [proofOrder, setProofOrder] = useState(null);
  const [proofMode, setProofMode] = useState('payment');
  const [checked, setChecked] = useState(false);
  const [proof, setProof] = useState({
    payment_reference: '', verified_amount: '', evidence_date: '',
    evidence_source: 'bank_statement', evidence_note: ''
  });
  const [history, setHistory] = useState({ orderId: null, entries: [] });

  const load = () => {
    setLoading(true);
    adminAPI.getOrders().then(r => setOrders(r.data || []))
      .catch(() => toast.error('Siparişler yüklenemedi'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const updateStatus = async (id, status) => {
    if (!window.confirm('Siparişin yeni durumu: ' + status + '. Onaylıyor musunuz?')) return;
    setBusy(true);
    try {
      await adminAPI.updateOrderStatus(id, status);
      toast.success('Durum ve denetim kaydı güncellendi');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Durum değiştirilemedi');
    } finally { setBusy(false); }
  };

  const startVerification = (o, mode = 'payment') => {
    setProofMode(mode);
    setProofOrder(o.order_id);
    setChecked(false);
    setProof({
      payment_reference: '', verified_amount: String(o.total_amount),
      evidence_date: '', evidence_source: 'bank_statement', evidence_note: ''
    });
  };
  const verifyTransfer = async (event) => {
    event.preventDefault();
    if (!checked) {
      toast.error('Banka kaydını kontrol ettiğinizi onaylamalısınız');
      return;
    }
    setBusy(true);
    try {
      if (proofMode === 'refund') {
        await adminAPI.verifyBankRefund(proofOrder, proof);
      } else {
        await adminAPI.verifyBankTransfer(proofOrder, proof);
      }
      toast.success(proofMode === 'refund' ? 'Gerçek banka iadesi ve stok geri alma kaydedildi' : 'Manuel banka kontrolü denetim kaydıyla işlendi');
      setProofOrder(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Banka kontrolü kaydedilemedi');
    } finally { setBusy(false); }
  };
  const viewAudit = async (id) => {
    try {
      const r = await adminAPI.getOrderAudit(id);
      setHistory({ orderId: id, entries: r.data || [] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Denetim geçmişi yüklenemedi');
    }
  };

  const statusColors = { pending: 'warning', paid: 'info', shipped: 'primary', delivered: 'success', cancelled: 'danger' };
  const statusLabels = { pending: 'Beklemede', paid: 'Ödendi', shipped: 'Kargoda', delivered: 'Teslim Edildi', cancelled: 'İptal' };

  if (loading) return <div className="text-center py-5"><div className="spinner-border"></div></div>;

  return (
    <div>
      <div className="alert alert-info">
        Banka ödemeleri yalnızca yönetici tarafından gerçek banka kaydıyla karşılaştırılarak manuel onaylanabilir.
        İşlem referansı ve denetim notu saklanır. Kart/PayPal doğrulaması henüz desteklenmiyor.
        Bekleyen siparişler süre dolunca stok/kontenjanı serbest bırakır. Gerçek banka iadesi yalnızca admin tarafından, çıkış işlemi kontrol edilerek ve sevkiyattan önce yapılabilir.
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-bordered align-middle">
          <thead className="table-dark"><tr><th>ID</th><th>Müşteri</th><th>Tutar</th><th>Ödeme</th><th>Durum</th><th>Tarih</th><th>İşlemler</th></tr></thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.order_id}>
                <td>#{o.order_id}</td>
                <td>{o.user?.full_name || o.user?.username || '-'}</td>
                <td className="fw-semibold">{parseFloat(o.total_amount).toLocaleString('tr-TR')} ₺</td>
                <td>{o.payment_method === 'bank_transfer' ? 'Havale/EFT' : o.payment_method + ' (entegrasyon yok)'}</td>
                <td><span className={'badge bg-' + statusColors[o.status]}>{statusLabels[o.status]}</span></td>
                <td>{new Date(o.created_at).toLocaleDateString('tr-TR')}</td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    {isAdmin && o.status === 'pending' && o.payment_method === 'bank_transfer' && (!o.expires_at || new Date(o.expires_at) > new Date()) && (
                      <button className="btn btn-sm btn-outline-success" disabled={busy} onClick={() => startVerification(o)}>Banka Kaydını Doğrula</button>
                    )}
                    {o.status === 'paid' && !o.items?.some(item => item.item_type === 'event') && (
                      <button className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => updateStatus(o.order_id, 'shipped')}>Kargoya Ver</button>
                    )}
                    {isAdmin && o.status === 'paid' && o.payment_method === 'bank_transfer' && (
                      <button className="btn btn-sm btn-outline-danger" disabled={busy}
                        onClick={() => startVerification(o, 'refund')}>Banka İadesini Kaydet</button>
                    )}
                    {o.status === 'shipped' && (
                      <button className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => updateStatus(o.order_id, 'delivered')}>Teslim Et</button>
                    )}
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => viewAudit(o.order_id)}>Denetim Geçmişi</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {proofOrder !== null && (
        <form onSubmit={verifyTransfer} className="card p-3 mb-4" aria-label="Banka havalesi manuel doğrulama">
          <h5>#{proofOrder} — {proofMode === 'refund' ? 'Banka İadesi Mutabakatı' : 'Banka Tahsilatı Mutabakatı'} (yalnızca admin)</h5>
          <p className="text-muted small">{proofMode === 'refund' ? 'Müşteriye yapılmış gerçek para çıkışını banka hesabının ekstresinden doğrulayın. İade talebi veya dekont görseli tek başına yeterli değildir.' : 'Dekont fotoğrafı tek başına ödeme kanıtı değildir. İşlemi bankanızın ekstre veya resmî panel kayıtlarında doğrulayın.'}</p>
          <div className="row g-2">
            <div className="col-md-6">
              <label className="form-label">Banka işlem referansı</label>
              <input required className="form-control" minLength={8} maxLength={80} value={proof.payment_reference}
                onChange={e => setProof(p => ({ ...p, payment_reference: e.target.value }))} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Kontrol edilen tutar (₺)</label>
              <input required className="form-control" type="number" step="0.01" min="0.01"
                value={proof.verified_amount} onChange={e => setProof(p => ({ ...p, verified_amount: e.target.value }))} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Banka işlem tarihi</label>
              <input required type="date" className="form-control" value={proof.evidence_date}
                onChange={e => setProof(p => ({ ...p, evidence_date: e.target.value }))} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Doğrulanan kaynak</label>
              <select className="form-select" value={proof.evidence_source}
                onChange={e => setProof(p => ({ ...p, evidence_source: e.target.value }))}>
                <option value="bank_statement">Banka hesap ekstresi</option>
                <option value="bank_portal">Banka işlem paneli</option>
              </select>
            </div>
            <div className="col-md-8">
              <label className="form-label">Denetim notu (15-500 karakter)</label>
              <textarea required minLength={15} maxLength={500} className="form-control" rows={2}
                value={proof.evidence_note} onChange={e => setProof(p => ({ ...p, evidence_note: e.target.value }))} />
            </div>
          </div>
          <label className="form-check mt-3 mb-3">
            <input className="form-check-input" type="checkbox" checked={checked}
              onChange={e => setChecked(e.target.checked)} required />
            <span className="form-check-label">{proofMode === 'refund' ? 'Gerçek banka çıkışını, alıcıyı, tutarı, tarihi ve özgün iade referansını doğruladım.' : 'Banka kaydında referansı, tarihi, tutarı ve alıcı hesabı bağımsız olarak karşılaştırdım.'}</span>
          </label>
          <div className="d-flex gap-2">
            <button className="btn btn-success" type="submit" disabled={busy || !checked}>Manuel Kontrolü Kaydet</button>
            <button className="btn btn-outline-secondary" type="button" onClick={() => setProofOrder(null)}>Vazgeç</button>
          </div>
        </form>
      )}
      {history.orderId !== null && (
        <div className="card p-3">
          <div className="d-flex justify-content-between"><h5>#{history.orderId} — Denetim Geçmişi</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setHistory({ orderId: null, entries: [] })}>Kapat</button>
          </div>
          {history.entries.length === 0 ? <p className="text-muted">Henüz denetim kaydı yok.</p> :
            <div className="table-responsive"><table className="table table-sm">
              <thead><tr><th>Zaman</th><th>İşlemi yapan</th><th>Geçiş</th><th>İşlem referansı</th><th>Kanıt kaynağı</th><th>İşlem tarihi</th><th>Doğrulanan tutar</th><th>Kontrol notu</th></tr></thead>
              <tbody>{history.entries.map(a => <tr key={a.audit_id}>
                <td>{new Date(a.created_at).toLocaleString('tr-TR')}</td>
                <td>{a.actor?.username || a.actor_id}</td>
                <td>{a.from_status} → {a.to_status}</td>
                <td>{a.payment_reference || '—'}</td>
                <td>{a.evidence_source || '—'}</td>
                <td>{a.evidence_date || '—'}</td>
                <td>{a.verified_amount !== null ? a.verified_amount : '—'}</td>
                <td>{a.evidence_note || '—'}</td>
              </tr>)}</tbody>
            </table></div>}
        </div>
      )}
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
