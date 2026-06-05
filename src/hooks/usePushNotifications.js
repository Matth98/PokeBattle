import { useState, useEffect, useCallback } from 'react';
import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from '../firebase';
import { auth } from '../firebase';

const API_BASE_URL = 'https://pokebattle-backend.vercel.app/api';
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;
const STORAGE_KEY = 'push_token';
const UNSUBSCRIBED_KEY = 'push_unsubscribed';

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
  // 'default' | 'granted' | 'denied' | 'unsupported'
  const [permission, setPermission] = useState(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  // Token en état React — seule source de vérité, évite de lire localStorage à chaque render
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(false);

  // Resync la permission quand l'app repasse au premier plan
  // (ex : l'utilisateur vient de l'activer dans les Réglages système).
  // On écoute visibilitychange + focus (iOS PWA) avec un léger délai car
  // Notification.permission n'est pas mis à jour instantanément sur iOS.
  useEffect(() => {
    const syncPermission = () => {
      if (typeof Notification === 'undefined') return;
      setTimeout(() => setPermission(Notification.permission), 300);
    };
    document.addEventListener('visibilitychange', syncPermission);
    window.addEventListener('focus', syncPermission);
    return () => {
      document.removeEventListener('visibilitychange', syncPermission);
      window.removeEventListener('focus', syncPermission);
    };
  }, []);

  // Si permission déjà accordée mais token absent (ex : réinstallation PWA),
  // on re-subscribe silencieusement — sauf si l'utilisateur a explicitement désactivé.
  useEffect(() => {
    if (permission !== 'granted') return;
    if (token) return;
    if (localStorage.getItem(UNSUBSCRIBED_KEY)) return;
    subscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  const subscribe = useCallback(async () => {
    if (typeof Notification === 'undefined') return false;
    if (!VAPID_KEY) {
      console.error('[Push] REACT_APP_FIREBASE_VAPID_KEY manquant dans .env');
      return false;
    }

    setLoading(true);
    try {
      // Si déjà accordée, on ne rappelle pas requestPermission() (échoue sans geste utilisateur sur iOS)
      const perm = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;
      localStorage.removeItem(UNSUBSCRIBED_KEY); // l'utilisateur a activé explicitement

      const messaging = await getFirebaseMessaging();
      if (!messaging) return false;

      const swReg = await registerServiceWorker();
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg ?? undefined,
      });

      if (!fcmToken) return false;

      localStorage.setItem(STORAGE_KEY, fcmToken);
      setToken(fcmToken); // mise à jour de l'état React → re-render garanti

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
    if (!token) return;

    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ token }),
      });
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(UNSUBSCRIBED_KEY, '1'); // mémorise le choix explicite de l'utilisateur
      setToken(null); // mise à jour de l'état React → re-render garanti
    } catch (err) {
      console.error('[Push] Erreur unsubscribe:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const isSubscribed = permission === 'granted' && !!token;

  return { permission, isSubscribed, loading, subscribe, unsubscribe };
};
