import { useState, useEffect } from 'react';
import { supportAPI } from '../services/api';

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '' });
  const [newMsg, setNewMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { loadTickets(); }, []);

  const loadTickets = () => {
    supportAPI.getTickets().then(r => setTickets(r.data)).catch(() => {});
  };

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      await supportAPI.createTicket(newTicket);
      setNewTicket({ subject: '', message: '' });
      setShowForm(false);
      loadTickets();
    } catch (err) {
      alert(err.response?.data?.error || 'Hata');
    }
  };

  const viewTicket = async (id) => {
    try {
      const { data } = await supportAPI.getTicket(id);
      setSelected(data);
    } catch (err) {
      alert('Talep detayı alınamadı');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    try {
      await supportAPI.sendMessage(selected.ticket_id, { message_text: newMsg });
      setNewMsg('');
      viewTicket(selected.ticket_id);
    } catch (err) {
      alert(err.response?.data?.error || 'Hata');
    }
  };

  const statusBadge = (s) => {
    const map = { open: 'bg-info', in_progress: 'bg-warning', resolved: 'bg-success', closed: 'bg-secondary' };
    const labels = { open: 'Açık', in_progress: 'İşlemde', resolved: 'Çözüldü', closed: 'Kapalı' };
    return <span className={`badge ${map[s]}`}>{labels[s]}</span>;
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">📞 Müşteri Destek</h2>
        <button className="btn btn-dark" onClick={() => { setShowForm(!showForm); setSelected(null); }}>
          {showForm ? 'İptal' : '+ Yeni Talep'}
        </button>
      </div>

      {showForm && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body">
            <h5>Yeni Destek Talebi</h5>
            <form onSubmit={createTicket}>
              <div className="mb-3">
                <label className="form-label">Konu</label>
                <input className="form-control" value={newTicket.subject}
                  onChange={e => setNewTicket({ ...newTicket, subject: e.target.value })} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Mesaj</label>
                <textarea className="form-control" rows="3" value={newTicket.message}
                  onChange={e => setNewTicket({ ...newTicket, message: e.target.value })} required />
              </div>
              <button className="btn btn-dark">Gönder</button>
            </form>
          </div>
        </div>
      )}

      <div className="row g-4">
        <div className="col-md-5">
          <h5>Taleplerim</h5>
          {tickets.map(t => (
            <div key={t.ticket_id} className={`card mb-2 border-0 shadow-sm cursor-pointer ${selected?.ticket_id === t.ticket_id ? 'border-primary border-2' : ''}`}
              onClick={() => { viewTicket(t.ticket_id); setShowForm(false); }} style={{ cursor: 'pointer' }}>
              <div className="card-body py-2">
                <div className="d-flex justify-content-between">
                  <strong className="small">{t.subject}</strong>
                  {statusBadge(t.status)}
                </div>
                <small className="text-muted">{new Date(t.created_at).toLocaleDateString('tr-TR')}</small>
              </div>
            </div>
          ))}
          {tickets.length === 0 && <p className="text-muted small">Henüz destek talebiniz yok.</p>}
        </div>

        <div className="col-md-7">
          {selected && (
            <div className="card shadow-sm border-0">
              <div className="card-header bg-dark text-white d-flex justify-content-between">
                <span>{selected.subject}</span>
                {statusBadge(selected.status)}
              </div>
              <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {selected.messages?.map(m => (
                  <div key={m.message_id} className={`mb-2 p-2 rounded ${m.sender?.role === 'customer' ? 'bg-light' : 'bg-info bg-opacity-10'}`}>
                    <small className="fw-bold">{m.sender?.username} ({m.sender?.role})</small>
                    <p className="mb-0 small">{m.message_text}</p>
                    <small className="text-muted">{new Date(m.sent_at).toLocaleString('tr-TR')}</small>
                  </div>
                ))}
              </div>
              <div className="card-footer">
                <form onSubmit={sendMessage} className="d-flex gap-2">
                  <input className="form-control" placeholder="Mesajınızı yazın..."
                    value={newMsg} onChange={e => setNewMsg(e.target.value)} />
                  <button className="btn btn-dark">Gönder</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
