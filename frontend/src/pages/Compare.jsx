import { useState } from 'react';
import { compareAPI } from '../services/api';
import { toast } from 'react-hot-toast';

export default function Compare() {
  const [type, setType] = useState('artwork');
  const [ids, setIds] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    const idArray = ids.split(',').map(i => parseInt(i.trim())).filter(i => !isNaN(i));
    if (idArray.length < 2) { toast.error('En az 2 ID girin (virgülle ayırın)'); return; }

    try {
      const res = type === 'artwork'
        ? await compareAPI.artworks(idArray)
        : await compareAPI.events(idArray);
      setResults(res.data.comparison);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Karşılaştırma yapılamadı');
    }
  };

  const saveComparison = async () => {
    const idArray = ids.split(',').map(i => parseInt(i.trim())).filter(i => !isNaN(i));
    try {
      await compareAPI.save({ comparison_type: type, item_ids: idArray });
      toast.success('Karşılaştırma kaydedildi!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Kaydedilemedi');
    }
  };

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4">⚖️ Karşılaştırma</h2>
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label">Tür</label>
              <select className="form-select" value={type} onChange={e => { setType(e.target.value); setResults([]); }}>
                <option value="artwork">Eserler</option>
                <option value="event">Etkinlikler</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">ID'ler (virgülle ayırın)</label>
              <input type="text" className="form-control" placeholder="1, 2, 3" value={ids} onChange={e => setIds(e.target.value)} />
            </div>
            <div className="col-md-3">
              <button className="btn btn-dark w-100" onClick={handleCompare}>Karşılaştır</button>
            </div>
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-dark">
                {type === 'artwork' ? (
                  <tr><th>Eser</th><th>Sanatçı</th><th>Kategori</th><th>Fiyat</th><th>Stok</th><th>Puan</th><th>Görüntülenme</th></tr>
                ) : (
                  <tr><th>Etkinlik</th><th>Tarih</th><th>Saat</th><th>Süre</th><th>Fiyat</th><th>Doluluk</th><th>Puan</th></tr>
                )}
              </thead>
              <tbody>
                {results.map((item, i) => type === 'artwork' ? (
                  <tr key={i}>
                    <td className="fw-semibold">{item.title}</td>
                    <td>{item.artist}</td>
                    <td>{item.category}</td>
                    <td className="text-success fw-bold">{parseFloat(item.price).toLocaleString('tr-TR')} ₺</td>
                    <td>{item.stock_quantity}</td>
                    <td>{item.avg_rating ? `⭐ ${item.avg_rating}` : '-'}</td>
                    <td>{item.view_count}</td>
                  </tr>
                ) : (
                  <tr key={i}>
                    <td className="fw-semibold">{item.title}</td>
                    <td>{item.event_date}</td>
                    <td>{item.event_time}</td>
                    <td>{item.duration_minutes} dk</td>
                    <td className="text-success fw-bold">{parseFloat(item.price).toLocaleString('tr-TR')} ₺</td>
                    <td>{item.occupancy_rate}</td>
                    <td>{item.avg_rating ? `⭐ ${item.avg_rating}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-outline-dark" onClick={saveComparison}>💾 Karşılaştırmayı Kaydet</button>
        </>
      )}
    </div>
  );
}
