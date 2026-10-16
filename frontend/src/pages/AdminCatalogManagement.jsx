import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../services/api';

export default function AdminCatalogManagement() {
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);
  const [artistForm, setArtistForm] = useState({ name: '', bio: '', contact: '', website: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [artistEditing, setArtistEditing] = useState(null);
  const [categoryEditing, setCategoryEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      const [a, c] = await Promise.all([adminAPI.getArtists(), adminAPI.getCategories()]);
      setArtists(a.data || []);
      setCategories(c.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sanatçı/kategori verileri alınamadı');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submitArtist = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (artistEditing) await adminAPI.updateArtist(artistEditing, artistForm);
      else await adminAPI.createArtist(artistForm);
      toast.success('Sanatçı kaydedildi');
      setArtistEditing(null);
      setArtistForm({ name: '', bio: '', contact: '', website: '' });
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Sanatçı kaydedilemedi'); }
    finally { setBusy(false); }
  };
  const submitCategory = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (categoryEditing) await adminAPI.updateCategory(categoryEditing, categoryForm);
      else await adminAPI.createCategory(categoryForm);
      toast.success('Kategori kaydedildi');
      setCategoryEditing(null);
      setCategoryForm({ name: '', description: '' });
      await load();
    } catch (err) { toast.error(err.response?.data?.message || 'Kategori kaydedilemedi'); }
    finally { setBusy(false); }
  };
  const retireArtist = async (id) => {
    if (!window.confirm('Sanatçı pasifleştirilsin mi? Eski eser kayıtları korunur.')) return;
    try { await adminAPI.deleteArtist(id); await load(); toast.success('Sanatçı pasifleştirildi'); }
    catch (err) { toast.error(err.response?.data?.message || 'İşlem başarısız'); }
  };
  const removeCategory = async (id) => {
    if (!window.confirm('Boş kategori silinsin mi?')) return;
    try { await adminAPI.deleteCategory(id); await load(); toast.success('Kategori kaldırıldı'); }
    catch (err) { toast.error(err.response?.data?.message || 'Kategoride eser olabilir'); }
  };
  const patchArtist = async (a, active) => {
    try { await adminAPI.updateArtist(a.artist_id, { is_active: active }); await load(); }
    catch (err) { toast.error(err.response?.data?.message || 'Güncellenemedi'); }
  };

  return <div className="row g-4">
    <div className="col-xl-7">
      <h5>Sanatçılar</h5>
      <form onSubmit={submitArtist} className="card p-3 mb-3">
        <div className="row g-2">
          <div className="col-md-6"><label className="form-label">Ad Soyad</label>
            <input className="form-control" maxLength={100} minLength={2} required value={artistForm.name}
              onChange={e => setArtistForm({ ...artistForm, name: e.target.value })}/></div>
          <div className="col-md-6"><label className="form-label">İletişim</label>
            <input className="form-control" value={artistForm.contact}
              onChange={e => setArtistForm({ ...artistForm, contact: e.target.value })}/></div>
          <div className="col-md-12"><label className="form-label">Web sitesi</label>
            <input className="form-control" value={artistForm.website}
              onChange={e => setArtistForm({ ...artistForm, website: e.target.value })}/></div>
          <div className="col-md-12"><label className="form-label">Biyografi</label>
            <textarea className="form-control" rows={2} value={artistForm.bio}
              onChange={e => setArtistForm({ ...artistForm, bio: e.target.value })}/></div>
        </div>
        <div className="d-flex gap-2 mt-2"><button disabled={busy} className="btn btn-dark">
          {artistEditing ? 'Sanatçıyı Güncelle' : 'Sanatçı Ekle'}</button>
          {artistEditing && <button type="button" className="btn btn-outline-secondary"
            onClick={() => { setArtistEditing(null); setArtistForm({ name: '', bio: '', contact: '', website: '' }); }}>Vazgeç</button>}
        </div>
      </form>
      <div className="table-responsive"><table className="table table-sm table-hover align-middle">
        <thead><tr><th>Sanatçı</th><th>Eser</th><th>Durum</th><th>İşlem</th></tr></thead>
        <tbody>{artists.map(a => <tr key={a.artist_id}>
          <td>{a.name}</td><td>{a.artworks?.length || 0}</td>
          <td>{a.is_active ? 'Aktif' : 'Pasif'}</td>
          <td className="d-flex gap-1">
            <button className="btn btn-sm btn-outline-primary" onClick={() => {
              setArtistEditing(a.artist_id); setArtistForm({
                name: a.name, bio: a.bio || '', contact: a.contact || '', website: a.website || ''
              });
            }}>Düzenle</button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => patchArtist(a, !a.is_active)}>
              {a.is_active ? 'Pasifleştir' : 'Aktifleştir'}</button>
            {a.is_active && <button className="btn btn-sm btn-outline-danger"
              onClick={() => retireArtist(a.artist_id)}>Kaldır</button>}
          </td>
        </tr>)}</tbody>
      </table></div>
    </div>
    <div className="col-xl-5">
      <h5>Kategoriler</h5>
      <form onSubmit={submitCategory} className="card p-3 mb-3">
        <label className="form-label">Kategori adı</label>
        <input required maxLength={50} className="form-control mb-2" value={categoryForm.name}
          onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}/>
        <label className="form-label">Açıklama</label>
        <textarea className="form-control mb-2" value={categoryForm.description}
          onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}/>
        <div className="d-flex gap-2"><button className="btn btn-dark" disabled={busy}>
          {categoryEditing ? 'Kategoriyi Güncelle' : 'Kategori Ekle'}</button>
          {categoryEditing && <button type="button" className="btn btn-outline-secondary" onClick={() => {
            setCategoryEditing(null); setCategoryForm({ name: '', description: '' });
          }}>Vazgeç</button>}</div>
      </form>
      <table className="table table-sm"><thead><tr><th>Ad</th><th>İşlem</th></tr></thead>
        <tbody>{categories.map(category => <tr key={category.category_id}>
          <td>{category.name}</td>
          <td className="d-flex gap-1"><button className="btn btn-sm btn-outline-primary" onClick={() => {
            setCategoryEditing(category.category_id);
            setCategoryForm({ name: category.name, description: category.description || '' });
          }}>Düzenle</button>
          <button className="btn btn-sm btn-outline-danger" onClick={() => removeCategory(category.category_id)}>Sil</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
