import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { orderAPI, couponAPI } from '../services/api';

export default function Checkout() {
  const { cart, removeFromCart, updateQuantity, totalAmount, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const { data } = await couponAPI.validate(couponCode);
      if (data.valid) {
        let disc = 0;
        if (data.coupon.discount_percent) {
          disc = totalAmount * (parseFloat(data.coupon.discount_percent) / 100);
        } else if (data.coupon.discount_amount) {
          disc = parseFloat(data.coupon.discount_amount);
        }
        setDiscount(Math.min(disc, totalAmount));
        toast.success('Kupon uygulandı!');
      } else {
        setDiscount(0);
        toast.error(data.reason || 'Geçersiz kupon.');
      }
    } catch (err) {
      setDiscount(0);
      toast.error(err.response?.data?.error || 'Kupon doğrulanamadı');
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const items = cart.map(i => ({
        item_type: i.item_type,
        item_id: i.item_id,
        quantity: i.quantity
      }));
      await orderAPI.create({ items, payment_method: paymentMethod, coupon_code: couponCode || undefined });
      toast.success('Sipariş talebiniz alındı. Ödeme henüz doğrulanmadı.');
      clearCart();
      setTimeout(() => navigate('/orders'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Sipariş oluşturulurken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const finalTotal = totalAmount - discount;

  return (
    <div className="container py-4">
      <h2 className="fw-bold mb-4">🛒 Sepetim & Ödeme</h2>

      {cart.length === 0 ? (
        <div className="alert alert-info">Sepetiniz boş.</div>
      ) : (
        <div className="row g-4">
          <div className="col-md-8">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Sipariş Özeti</h5>
                <div className="table-responsive">
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Ürün/Etkinlik</th>
                        <th>Tür</th>
                        <th>Fiyat</th>
                        <th style={{ width: '120px' }}>Adet</th>
                        <th>Toplam</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map(item => (
                        <tr key={`${item.item_type}-${item.item_id}`}>
                          <td>{item.title}</td>
                          <td>
                            <span className={`badge ${item.item_type === 'event' ? 'bg-primary' : 'bg-secondary'}`}>
                              {item.item_type === 'event' ? 'Etkinlik Bileti' : 'Sanat Eseri'}
                            </span>
                          </td>
                          <td>{parseFloat(item.price).toLocaleString('tr-TR')} ₺</td>
                          <td>
                            <input type="number" className="form-control form-control-sm"
                              value={item.quantity} min="1" max={item.max_quantity}
                              onChange={e => updateQuantity(item.item_type, item.item_id, parseInt(e.target.value))} />
                          </td>
                          <td className="fw-bold">
                            {(parseFloat(item.price) * item.quantity).toLocaleString('tr-TR')} ₺
                          </td>
                          <td>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => removeFromCart(item.item_type, item.item_id)}>Sil</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="card shadow-sm border-0 mb-3">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Ödeme Tercihleri</h5>
                <div className="alert alert-info small" role="status">
                  Şu anda yalnızca manuel banka havalesi sipariş talebi kabul ediliyor.
                  Sipariş oluşturmak ödeme yaptığınız anlamına gelmez. Banka bilgileri ve ödeme talimatı
                  galeri yönetimi tarafından doğrulanmış iletişim kanalından sağlanmalıdır.
                  Kart ve PayPal ödeme altyapıları henüz kullanılabilir değil.
                </div>
                <div className="mb-3 fw-semibold">Havale / EFT — ödeme bekliyor</div>
                {cart.some(item => item.item_type === 'event') && (
                  <div className="alert alert-warning small" role="alert">
                    Etkinlik biletlerinin ödeme–rezervasyon bağlantısı henüz tamamlanmadı.
                    Bilet içeren sepetler için sipariş oluşturma geçici olarak kapalıdır.
                  </div>
                )}

                <h6 className="fw-semibold">İndirim Kuponu</h6>
                <div className="input-group mb-2">
                  <input type="text" className="form-control" placeholder="Kupon Kodu"
                    value={couponCode} onChange={e => setCouponCode(e.target.value)} />
                  <button className="btn btn-outline-dark" onClick={handleApplyCoupon}>Uygula</button>
                </div>
              </div>
            </div>

            <div className="card shadow-sm border-0 bg-dark text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between mb-2">
                  <span>Ara Toplam:</span>
                  <span>{totalAmount.toLocaleString('tr-TR')} ₺</span>
                </div>
                {discount > 0 && (
                  <div className="d-flex justify-content-between mb-2 text-warning">
                    <span>İndirim:</span>
                    <span>-{discount.toLocaleString('tr-TR')} ₺</span>
                  </div>
                )}
                <hr />
                <div className="d-flex justify-content-between mb-3 fs-5 fw-bold">
                  <span>Genel Toplam:</span>
                  <span>{finalTotal.toLocaleString('tr-TR')} ₺</span>
                </div>
                <button className="btn btn-light w-100 fw-bold py-2" onClick={handleCheckout} disabled={loading || cart.some(item => item.item_type === 'event')}>
                  {loading ? 'İşleniyor...' : 'Sipariş Talebi Oluştur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
