import { useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const VAPID_PUBLIC_KEY = 'BIKBie6M8xbJZ6AVkASm5UUoT2aQN_y2YtB30IGkdqynebJEgo-xIyrZZ4OmWBXJa8Py3D1saMvVodawu7Cq-cY';

// Map of notification types to sound URLs
const SOUNDS = {
  critical: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', // Siren
  emergency: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Alert
  volunteer: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3', // Ding
  resolved: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',  // Success
  blood: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3', // Distinct heartbeat/tone
  default: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'
};

export function useNotifications() {
  const { isAuthenticated, user } = useAuth();

  const playSound = useCallback((type) => {
    const url = SOUNDS[type] || SOUNDS.default;
    const audio = new Audio(url);
    audio.play().catch(e => console.warn('[AUDIO] Playback failed:', e));
  }, []);

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeUser = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      // Save to backend
      await api.post('/auth/subscribe', subscription);
      console.log('[PUSH] Subscribed successfully');
    } catch (err) {
      console.error('[PUSH ERROR] Subscription failed:', err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Request permission
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') subscribeUser();
        });
      } else if (Notification.permission === 'granted') {
        subscribeUser();
      }
    }
  }, [isAuthenticated, user, subscribeUser]);

  return { playSound };
}
