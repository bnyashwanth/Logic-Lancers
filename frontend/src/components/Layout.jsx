import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

export default function Layout() {
  const { isAuthenticated, logoutUser } = useAuth();
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
  const showApiBanner = import.meta.env.VITE_SHOW_API_BANNER === 'true';

  const handleLogout = () => {
    logoutUser();
  };

  return (
    <div className="min-h-screen flex flex-col font-body bg-surface text-primary">
      {/* Ticker */}
      {/* <div className="ticker-wrap">
        <div className="ticker">
          SYSTEM ONLINE • HACKATHON MODE ENGAGED • NO BORDERS ALLOWED • FULL VELOCITY AHEAD • SYSTEM ONLINE • HACKATHON MODE ENGAGED • NO BORDERS ALLOWED • FULL VELOCITY AHEAD • 
        </div>
      </div> */}

      {showApiBanner && (
        <div className="w-full bg-black text-white text-xs font-semibold tracking-wide px-6 py-2 flex items-center justify-between">
          <span>API: {apiUrl}</span>
          <span className="opacity-70">Mode: {import.meta.env.MODE}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className="glass-nav px-6 py-3 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2 text-primary no-underline">
          <img src={logo} alt="RescueSync Logo" className="w-10 h-10 object-contain" />
        </Link>
        <div className="flex items-center gap-6 mr-2">
          <Link to="/map" className="font-bold hover:text-secondary transition-colors text-sm no-underline">
            Live Map
          </Link>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 font-bold hover:text-secondary transition-colors cursor-pointer text-primary bg-transparent border-0"
              type="button"
            >
              <LogOut size={16} strokeWidth={2.5} /> Logout
            </button>
          )}
          {!isAuthenticated && (
            <div className="flex items-center gap-3 ml-4 pl-4 border-l border-outline-variant/20">
              <Link to="/login" className="flex items-center gap-2 font-bold hover:text-secondary transition-colors cursor-pointer text-primary no-underline">
                <LogIn size={16} strokeWidth={2.5} /> Login
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <Outlet />

      {/* Footer */}
      <footer className="bg-primary text-on-primary p-12 mt-auto">
        <div className="flex justify-between items-end">
           <div>
              <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="RescueSync Logo" className="w-8 h-8 object-contain" />
             <span className="font-display font-bold text-xl">RescueSync</span>
              </div>
            <p className="text-on-primary/60 max-w-sm">Real-time disaster response coordination for volunteers, NGOs, and anonymous SOS reporters.</p>
           </div>
           <div className="text-right text-sm font-bold tracking-wider text-on-primary/60">
            RescueSync • Offline-first emergency coordination
           </div>
        </div>
      </footer>
    </div>
  );
}
