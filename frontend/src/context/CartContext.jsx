import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.item_type === item.item_type && i.item_id === item.item_id);
      if (existing) {
        if (existing.quantity + item.quantity <= item.max_quantity) {
          return prev.map(i => 
            i.item_type === item.item_type && i.item_id === item.item_id
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          );
        }
        return prev; // Maksimum kapasiteyi aşarsa ekleme
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (item_type, item_id) => {
    setCart(prev => prev.filter(i => !(i.item_type === item_type && i.item_id === item_id)));
  };

  const updateQuantity = (item_type, item_id, quantity) => {
    setCart(prev => prev.map(i => {
      if (i.item_type === item_type && i.item_id === item_id) {
        const newQty = Math.max(1, Math.min(quantity, i.max_quantity));
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  const totalAmount = cart.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, totalAmount, itemCount }}>
      {children}
    </CartContext.Provider>
  );
};
