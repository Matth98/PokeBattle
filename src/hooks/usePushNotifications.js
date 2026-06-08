import { useState, useEffect, useCallback, useRef } from 'react';
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
  const refreshing = useRef(false);

  // Refresh FCM token silently if it rotated (e.g. after PWA kill/restart).
  // getToken() is idempotent: returns the same token if still valid,
  // or a new one if the browser rotated the underlying push subscription.
  // Uses getRegistration() instead of register() to avoid triggering a SW
  // update cycle that would fire controllerchange → window.location.reload().
  const refreshTokenSilently = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem(UNSUBSCRIBED_KEY)) return;
    if (!VAPID_KEY) return;
    if (refreshing.current) return;
    refreshing.current = true;
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;
      // Read the existing SW registration without re-registering (safe for frequent calls).
      const swReg = 'serviceWorker' in navigator
        ? await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
        : undefined;
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });
      if (!fcmToken) return;
      const stored = localStorage.getItem(STORAGE_KEY);
      if (fcmToken === stored) return; // unchanged
      // Token rotated — update storage and re-register with backend
      localStorage.setItem(STORAGE_KEY, fcmToken);
      setToken(fcmToken);
      await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ token: fcmToken }),
      });
    } catch {
      // fail silently — token refresh is a best-effort background operation
    } finally {
      refreshing.current = false;
    }
  }, []);

  // On mount: refresh token in case it rotated while the PWA was killed.
  useEffect(() => {
    refreshTokenSilently();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resync permission + refresh token when app regains focus
  // (e.g. user enabled notifs from system settings, or PWA re-opened after kill).
  useEffect(() => {
    const syncPermission = () => {
      if (typeof Notification === 'undefined') return;
      setTimeout(() => setPermission(Notification.permission), 300);
    };
    const onVisibility = () => {
      syncPermission();
      if (document.visibilityState === 'visible') refreshTokenSilently();
    };
    const onFocus = () => {
      syncPermission();
      refreshTokenSilently();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshTokenSilently]);

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
