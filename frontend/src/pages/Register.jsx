import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.register(form);
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Kayıt başarısız');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: '500px' }}>
      <div className="card shadow border-0">
        <div className="card-body p-4">
          <h3 className="text-center mb-4 fw-bold">🎨 Kayıt Ol</h3>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Kullanıcı Adı *</label>
              <input type="text" className="form-control" value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })} required minLength={3} />
            </div>
            <div className="mb-3">
              <label className="form-label">E-posta *</label>
              <input type="email" className="form-control" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="mb-3">
              <label className="form-label">Şifre *</label>
              <input type="password" className="form-control" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div className="mb-3">
              <label className="form-label">Ad Soyad</label>
              <input type="text" className="form-control" value={form.full_name}
                onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="mb-3">
              <label className="form-label">Telefon</label>
              <input type="tel" className="form-control" value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button className="btn btn-dark w-100" disabled={loading}>
              {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
            </button>
          </form>
          <p className="text-center mt-3 mb-0">
            Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
