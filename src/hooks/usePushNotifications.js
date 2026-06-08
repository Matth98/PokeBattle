import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken } from 'firebase/messaging';
import { getFirebaseMessaging } from '../firebase';
import { auth } from '../firebase';

const API_BASE_URL = 'https://pokebattle-backend.vercel.app/api';
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY;
const STORAGE_KEY = 'push_token';
const UNSUBSCRIBED_KEY = 'push_unsubscribed';
const SESSION_KEY = 'push_refreshed';

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

// Prefer the existing SW registration to avoid triggering an update cycle.
// Falls back to register() only if the SW has never been registered.
const getSwRegistration = async () => {
  if (!('serviceWorker' in navigator)) return undefined;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const existing = registrations.find(
      (r) =>
        r.active?.scriptURL?.endsWith('firebase-messaging-sw.js') ||
        r.installing?.scriptURL?.endsWith('firebase-messaging-sw.js') ||
        r.waiting?.scriptURL?.endsWith('firebase-messaging-sw.js')
    );
    return existing ?? (await registerServiceWorker()) ?? undefined;
  } catch {
    return undefined;
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

  // Re-register the FCM token with the backend once per PWA session.
  // sessionStorage is cleared on kill/restart (unlike localStorage), so this
  // runs exactly once after each force-quit, recovering from the case where
  // the backend purged the token after a failed FCM delivery.
  const refreshTokenSilently = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    if (localStorage.getItem(UNSUBSCRIBED_KEY)) return;
    if (!VAPID_KEY) return;
    if (refreshing.current) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    refreshing.current = true;
    try {
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;
      const swReg = await getSwRegistration();
      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });
      if (!fcmToken) return;
      // Update local state only if the token actually changed.
      const stored = localStorage.getItem(STORAGE_KEY);
      if (fcmToken !== stored) {
        localStorage.setItem(STORAGE_KEY, fcmToken);
        setToken(fcmToken);
      }
      // Always POST to backend — it deduplicates. This re-adds the token if
      // the backend purged it after a failed delivery (PWA kill on iOS).
      await fetch(`${API_BASE_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify({ token: fcmToken }),
      });
      // Mark done only after success so we retry if the fetch failed.
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // fail silently — will retry on next visibility/focus event
    } finally {
      refreshing.current = false;
    }
  }, []);

  // On mount: re-register in case the backend purged the token while the PWA
  // was killed (sessionStorage is cleared on kill so this runs once per restart).
  useEffect(() => {
    refreshTokenSilently();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resync permission + re-register token when app regains focus.
  // The sessionStorage guard makes these no-ops after the first successful run.
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
      setToken(fcmToken);
      sessionStorage.setItem(SESSION_KEY, '1');

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
      sessionStorage.removeItem(SESSION_KEY);
      setToken(null);
    } catch (err) {
      console.error('[Push] Erreur unsubscribe:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const isSubscribed = permission === 'granted' && !!token;

  return { permission, isSubscribed, loading, subscribe, unsubscribe };
};
