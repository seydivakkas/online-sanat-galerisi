import { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({ username: '', full_name: '', phone: '' });
  const [passForm, setPassForm] = useState({ current_password: '', new_password: '' });
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    userAPI.getProfile().then(r => {
      setForm({ username: r.data.username || '', full_name: r.data.full_name || '', phone: r.data.phone || '' });
    }).catch(() => {});
  }, []);

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await userAPI.updateProfile(form);
      login(data.user, localStorage.getItem('token'));
      setMsg({ text: 'Profil güncellendi', type: 'success' });
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Hata', type: 'danger' });
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await userAPI.changePassword(passForm);
      setPassForm({ current_password: '', new_password: '' });
      setMsg({ text: 'Şifre değiştirildi', type: 'success' });
    } catch (err) {
      setMsg({ text: err.response?.data?.error || 'Hata', type: 'danger' });
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: '600px' }}>
      <h2 className="fw-bold mb-4">👤 Profilim</h2>
      {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <h5>Bilgi Güncelleme</h5>
          <form onSubmit={updateProfile}>
            <div className="mb-3">
              <label className="form-label">E-posta</label>
              <input className="form-control" value={user?.email} disabled />
            </div>
            <div className="mb-3">
              <label className="form-label">Kullanıcı Adı</label>
              <input className="form-control" value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Ad Soyad</label>
              <input className="form-control" value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Telefon</label>
              <input className="form-control" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button className="btn btn-dark">Güncelle</button>
          </form>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h5>Şifre Değiştir</h5>
          <form onSubmit={changePassword}>
            <div className="mb-3">
              <label className="form-label">Mevcut Şifre</label>
              <input type="password" className="form-control" value={passForm.current_password}
                onChange={e => setPassForm({ ...passForm, current_password: e.target.value })} required />
            </div>
            <div className="mb-3">
              <label className="form-label">Yeni Şifre</label>
              <input type="password" className="form-control" value={passForm.new_password}
                onChange={e => setPassForm({ ...passForm, new_password: e.target.value })} required minLength={6} />
            </div>
            <button className="btn btn-warning">Şifre Değiştir</button>
          </form>
        </div>
      </div>
    </div>
  );
}
