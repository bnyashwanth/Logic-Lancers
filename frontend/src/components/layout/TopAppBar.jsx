import './TopAppBar.css';
import Icon from '../ui/Icon';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function TopAppBar() {
  const isOnline = useOnlineStatus();

  return (
    <>
      <header className="top-app-bar">
        <div className="top-app-bar__leading">
          <Icon name="signal_cellular_alt_2_bar" size={24} />
        </div>
        <div className="top-app-bar__title">RESPONDER</div>
        <div className="top-app-bar__trailing" />
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
