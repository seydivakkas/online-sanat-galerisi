import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import ArtworkList from './pages/ArtworkList';
import ArtworkDetail from './pages/ArtworkDetail';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import Favorites from './pages/Favorites';
import Reservations from './pages/Reservations';
import Orders from './pages/Orders';
import Checkout from './pages/Checkout';
import Compare from './pages/Compare';
import Support from './pages/Support';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Toaster position="top-right" />
        <BrowserRouter>
          <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/artworks" element={<ArtworkList />} />
          <Route path="/artworks/:id" element={<ArtworkDetail />} />
          <Route path="/events" element={<EventList />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
          <Route path="/reservations" element={<ProtectedRoute><Reservations /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/compare" element={<ProtectedRoute><Compare /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin','gallery_manager']}><AdminDashboard /></ProtectedRoute>} />
        </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
