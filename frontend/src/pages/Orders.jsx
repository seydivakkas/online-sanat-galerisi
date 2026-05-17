import { useState, useEffect } from 'react';
import { orderAPI } from '../services/api';

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    orderAPI.getAll().then(r => setOrders(r.data)).catch(() => {});
  }, []);

  const statusBadge = (status) => {
    const map = { pending: 'bg-warning', paid: 'bg-info', shipped: 'bg-primary', delivered: 'bg-success', cancelled: 'bg-danger' };
    const labels = { pending: 'Beklemede', paid: 'Ödendi', shipped: 'Kargoda', delivered: 'Teslim Edildi', cancelled: 'İptal' };
    return <span className={`badge ${map[status]}`}>{labels[status]}</span>;
  };

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4">📦 Siparişlerim</h2>
      {orders.length === 0 ? (
        <p className="text-muted">Henüz siparişiniz yok.</p>
      ) : (
        orders.map(order => (
          <div key={order.order_id} className="card mb-3 shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div>
                  <strong>Sipariş #{order.order_id}</strong>
                  <span className="text-muted ms-2 small">
                    {new Date(order.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  {statusBadge(order.status)}
                  <span className="fw-bold text-success">{parseFloat(order.total_amount).toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>
              {order.discount_amount > 0 && (
                <p className="small text-danger mb-1">İndirim: -{parseFloat(order.discount_amount).toLocaleString('tr-TR')} ₺</p>
              )}
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead><tr><th>Ürün</th><th>Tür</th><th>Adet</th><th>Birim Fiyat</th></tr></thead>
                  <tbody>
                    {order.items?.map(item => (
                      <tr key={item.id}>
                        <td>{item.item_type === 'artwork' ? item.artwork?.title : item.event?.title || '-'}</td>
                        <td><span className={`badge ${item.item_type === 'artwork' ? 'bg-primary' : 'bg-info'}`}>{item.item_type === 'artwork' ? '🖼️ Eser' : '📅 Etkinlik'}</span></td>
                        <td>{item.quantity}</td>
                        <td>{parseFloat(item.unit_price).toLocaleString('tr-TR')} ₺</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
