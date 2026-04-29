import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MapPage from './pages/MapPage';
import FeedPage from './pages/FeedPage';
import RequestPage from './pages/RequestPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import MyRequestsPage from './pages/MyRequestsPage';
import { useNotifications } from './hooks/useNotifications';
import { connectSocket, disconnectSocket } from './services/socket';
import { useEffect } from 'react';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100dvh', color: 'var(--color-on-surface-variant)' }}>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return !isAuthenticated ? children : <Navigate to="/map" replace />;
}

function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  const isLocalAdmin = sessionStorage.getItem('admin_authenticated') === 'true';
  if (!isAuthenticated || (user?.role !== 'ADMIN' && !isLocalAdmin)) return <Navigate to="/map" replace />;
  return children;
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  const { playSound } = useNotifications();

  useEffect(() => {
    if (isAuthenticated) {
      const socket = connectSocket();
      
      // Listen for notification-worthy events
      socket.on('incident:new', (incident) => {
        const isBlood = incident.title.toLowerCase().includes('blood') || incident.tags?.some(t => t.toLowerCase().includes('blood'));
        if (isBlood) {
          playSound('blood');
        } else if (incident.urgency === 'CRITICAL') {
          playSound('critical');
        }
      });

      socket.on('incident:updated', (incident) => {
        // If I am the requester, and someone new volunteered
        // (This is a simplified check, ideally the backend should emit a notification event)
        playSound('volunteer');
      });
    }
    return () => disconnectSocket();
  }, [isAuthenticated, playSound]);

  return (
    <Routes>
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/map" element={<MapPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/request" element={<RequestPage />} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/my-requests" element={<MyRequestsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/map" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
