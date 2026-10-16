import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../services/api';

const statusLabels = {
  open: 'Açık', in_progress: 'İşlemde', resolved: 'Çözüldü', closed: 'Kapalı'
};
const allowed = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['in_progress', 'closed'],
  closed: ['in_progress']
};

export default function AdminSupportManagement() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await adminAPI.getSupportTickets(filter ? { status: filter } : {});
      setTickets(r.data || []);
    } catch (e) { toast.error(e.response?.data?.message || 'Destek talepleri yüklenemedi'); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const open = async id => {
    try {
      const r = await adminAPI.getSupportTicket(id);
      setSelected(r.data);
      setMessage('');
    } catch (e) { toast.error(e.response?.data?.message || 'Talep detayı alınamadı'); }
  };
  const setStatus = async (status) => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await adminAPI.updateTicketStatus(selected.ticket_id, status);
      toast.success('Destek talebi güncellendi');
      await open(selected.ticket_id);
      await load();
    } catch (e) { toast.error(e.response?.data?.message || 'Durum güncellenemedi'); }
    finally { setBusy(false); }
  };
  const send = async e => {
    e.preventDefault();
    if (!selected || !message.trim()) return;
    setBusy(true);
    try {
      await adminAPI.replySupportTicket(selected.ticket_id, message.trim());
      await open(selected.ticket_id);
      await load();
      toast.success('Yanıt kaydedildi');
    } catch (err) { toast.error(err.response?.data?.message || 'Yanıt gönderilemedi'); }
    finally { setBusy(false); }
  };

  return <div>
    <div className="d-flex flex-wrap justify-content-between mb-3 gap-2">
      <h5>Müşteri Destek Talepleri</h5>
      <select className="form-select w-auto" aria-label="Duruma göre filtrele" value={filter}
        onChange={e => setFilter(e.target.value)}>
        <option value="">Tüm durumlar</option>
        {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </div>
    <div className="row g-3">
      <div className="col-lg-5">
        <div className="list-group">
          {tickets.map(t => <button type="button" key={t.ticket_id}
            className={'list-group-item list-group-item-action ' + (selected?.ticket_id === t.ticket_id ? 'active' : '')}
            onClick={() => open(t.ticket_id)}>
            <div className="d-flex justify-content-between gap-2">
              <strong>#{t.ticket_id} — {t.subject}</strong>
              <span className="small">{statusLabels[t.status]}</span>
            </div>
            <div className="small">{t.user?.full_name || t.user?.username || 'Müşteri'} · {t.user?.email || ''}</div>
          </button>)}
          {tickets.length === 0 && <p className="text-muted">Bu filtrede talep bulunamadı.</p>}
        </div>
      </div>
      <div className="col-lg-7">
        {selected ? <div className="card">
          <div className="card-header d-flex justify-content-between gap-2">
            <strong>#{selected.ticket_id} — {selected.subject}</strong>
            <span>{statusLabels[selected.status]}</span>
          </div>
          <div className="card-body" style={{ maxHeight: 420, overflowY: 'auto' }}>
            {(selected.messages || []).map(m => <div className="mb-3" key={m.message_id}>
              <div className="small text-muted">{m.sender?.username || m.sender_id} · {new Date(m.sent_at).toLocaleString('tr-TR')}</div>
              <p className="mb-0">{m.message_text}</p>
            </div>)}
          </div>
          <div className="card-footer">
            <div className="d-flex gap-2 mb-3">
              {allowed[selected.status]?.map(status => <button key={status}
                type="button" className="btn btn-sm btn-outline-secondary" disabled={busy}
                onClick={() => setStatus(status)}>{statusLabels[status]} Yap</button>)}
            </div>
            <form onSubmit={send}>
              <label className="form-label">Yanıt</label>
              <textarea className="form-control mb-2" minLength={1} maxLength={5000}
                value={message} rows={3} onChange={e => setMessage(e.target.value)}
                disabled={selected.status === 'closed'} required/>
              <button className="btn btn-dark" disabled={busy || selected.status === 'closed' || !message.trim()}>
                Yanıt Gönder</button>
            </form>
          </div>
        </div> : <p className="text-muted">Mesajları görmek için bir destek talebi seçin.</p>}
      </div>
    </div>
  </div>;
}
