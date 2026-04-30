import { useState, useEffect, useCallback } from 'react';
import Icon from '../ui/Icon';
import './NotificationToast.css';

export default function NotificationToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  // Expose globally so socket listeners can trigger it
  useEffect(() => {
    window.__addNotificationToast = addToast;
    return () => { delete window.__addNotificationToast; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div className="notification-toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`notification-toast notification-toast--${toast.type || 'info'}`}>
          <Icon name={toast.icon || 'notifications'} filled size={20} />
          <div className="notification-toast__content">
            <strong>{toast.title}</strong>
            <p>{toast.body}</p>
          </div>
          <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
