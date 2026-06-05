import { useState, useEffect, useCallback } from 'react';
import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from '../firebase';
import { auth } from '../firebase';

const API_BASE_URL = 'https://pokebattle-backend.vercel.app/api';
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;
const STORAGE_KEY = 'push_token';

const getAuthHeaders = async () => {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch {
    return null;
  }
};

export const usePushNotifications = () => {
  // 'unknown' | 'granted' | 'denied' | 'unsupported'
  const [permission, setPermission] = useState(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  });
  const [loading, setLoading] = useState(false);

  // Active les notifications automatiquement au premier chargement
  useEffect(() => {
    if (permission === 'unsupported' || permission === 'denied') return;
    if (permission === 'granted' && localStorage.getItem(STORAGE_KEY)) return;
    subscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subscribe = useCallback(async () => {
    if (typeof Notification === 'undefined') return false;
    if (!VAPID_KEY) {
      console.error('[Push] REACT_APP_FIREBASE_VAPID_KEY manquant dans .env');
      return false;
    }

    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const messaging = await getFirebaseMessaging();
      if (!messaging) return false;

      const swReg = await registerServiceWorker();
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg ?? undefined,
      });

      if (!fcmToken) return false;

      localStorage.setItem(STORAGE_KEY, fcmToken);

      await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ token: fcmToken }),
      });

      return true;
    } catch (err) {
      console.error('[Push] Erreur subscribe:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    const fcmToken = localStorage.getItem(STORAGE_KEY);
    if (!fcmToken) return;

    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ token: fcmToken }),
      });
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('[Push] Erreur unsubscribe:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const isSubscribed = permission === 'granted' && !!localStorage.getItem(STORAGE_KEY);

  return { permission, isSubscribed, loading, subscribe, unsubscribe };
};
