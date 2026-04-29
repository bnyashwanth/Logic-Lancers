import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import GuestOnlyRoute from './components/GuestOnlyRoute';
import ProtectedRoute from './components/ProtectedRoute';
import UserProtectedRoute from './components/UserProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import ChatWidget from './components/ChatWidget';
import InstallPWA from './components/InstallPWA';
import MapDashboard from './pages/MapDashboard';
import VictimDashboard from './pages/VictimDashboard';
import Layout from './components/Layout';
import Admin from './pages/Admin';

function App() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter>
        {!isOnline ? (
          <div className="w-full bg-amber-400 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.3em] text-black">
            Offline — SOS requests will sync when reconnected
          </div>
        ) : null}
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<VictimDashboard />} />
            <Route
              path="/login"
              element={
                <GuestOnlyRoute>
                  <Login />
                </GuestOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestOnlyRoute>
                  <Register />
                </GuestOnlyRoute>
              }
            />
          </Route>
          <Route
            path="/admin/login"
            element={
              <GuestOnlyRoute>
                <Login />
              </GuestOnlyRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <UserProtectedRoute>
                <MapDashboard />
              </UserProtectedRoute>
            }
          />
        </Routes>
        <InstallPWA />
        <ChatWidget />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
