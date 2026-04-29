import './TopAppBar.css';
import Icon from '../ui/Icon';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function TopAppBar() {
  const isOnline = useOnlineStatus();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header className="top-app-bar">
        <div className="top-app-bar__leading">
          <Icon name="signal_cellular_alt_2_bar" size={24} />
        </div>
        <div className="top-app-bar__title">RESPONDER</div>
        <div className="top-app-bar__trailing">
          {user?.role === 'ADMIN' && (
            <button className="top-app-bar__admin-btn" onClick={() => navigate('/admin')} title="Admin Panel">
              <Icon name="admin_panel_settings" size={24} />
            </button>
          )}
        </div>
      </header>
      {!isOnline && (
        <div className="offline-banner">
          <Icon name="warning" filled size={20} />
          <div>
            <div className="offline-banner__title">OFFLINE MODE</div>
            <div className="offline-banner__subtitle">Changes will sync when connection is restored</div>
          </div>
        </div>
      )}
    </>
  );
}
