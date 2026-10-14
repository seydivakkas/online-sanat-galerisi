import { useState, useEffect } from 'react';
import { orderAPI } from '../services/api';
import { toast } from 'react-hot-toast';

export default function Orders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    orderAPI.getAll().then(r => setOrders(r.data)).catch(() => {});
  }, []);

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Ödeme bekleyen siparişinizi iptal etmek istiyor musunuz? Ayrılan stok ve kontenjan geri açılır.')) return;
    try {
      await orderAPI.cancel(orderId);
      setOrders(prev => prev.map(o =>
        o.order_id === orderId ? { ...o, status: 'cancelled' } : o
      ));
      toast.success('Sipariş iptal edildi; stok ve kontenjan yeniden açıldı.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sipariş iptal edilemedi');
    }
  };

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
                  {order.status === 'pending' && (
                    <button className="btn btn-sm btn-outline-danger" onClick={() => cancelOrder(order.order_id)}>Siparişi İptal Et</button>
                  )}
                  <span className="fw-bold text-success">{parseFloat(order.total_amount).toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>
              {order.status === 'pending' && order.expires_at && (
                <p className="small text-warning mb-1">
                  Ödeme doğrulaması için ayrılan stok süresi: {new Date(order.expires_at).toLocaleString('tr-TR')}
                </p>
              )}
              {order.status === 'paid' && (
                <p className="small text-muted mb-1">
                  Banka kaydı doğrulandı. Sevk edilmemiş siparişlerde iade için galeri yönetimiyle iletişime geçebilirsiniz.
                </p>
              )}
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
