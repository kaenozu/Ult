/**
 * Service Worker Registration and Utilities
 * 
 * PWA対応とオフライン機能のためのService Worker管理
 */

import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdating: boolean;
  updateAvailable: boolean;
  offlineReady: boolean;
}

interface ServiceWorkerManager {
  registration: ServiceWorkerRegistration | null;
  update: () => Promise<void>;
  unregister: () => Promise<void>;
}

/**
 * Service Workerを登録
 */
export async function registerServiceWorker(): Promise<ServiceWorkerManager | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('[ServiceWorker] Not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'imports',
    });

    console.log('[ServiceWorker] Registered:', registration.scope);

    // 更新チェック
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('[ServiceWorker] Update found');
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 新しいバージョンが利用可能
            console.log('[ServiceWorker] New version available');
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });

    return {
      registration,
      update: async () => {
        await registration.update();
      },
      unregister: async () => {
        await registration.unregister();
      },
    };
  } catch (error) {
    console.error('[ServiceWorker] Registration failed:', error);
    return null;
  }
}

/**
 * React Hook for Service Worker management
 */
export function useServiceWorker(): ServiceWorkerState & {
  update: () => Promise<void>;
  skipWaiting: () => void;
} {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isUpdating: false,
    updateAvailable: false,
    offlineReady: false,
  });

  const [registration, setRegistration] = useState<ServiceWorkerManager | null>(null);

  useEffect(() => {
    // Service Workerサポート確認
    const isSupported = 'serviceWorker' in navigator;
    
    // Use requestAnimationFrame to defer setState to avoid synchronous call
    requestAnimationFrame(() => {
      setState((prev) => ({ ...prev, isSupported }));
    });

    if (!isSupported) return;

    // 登録
    registerServiceWorker().then((reg) => {
      if (reg) {
        setRegistration(reg);
        setState((prev) => ({ ...prev, isRegistered: true }));

        // オフライン準備完了を確認
        if (reg.registration?.active) {
          setState((prev) => ({ ...prev, offlineReady: true }));
        }
      }
    });

    // 更新イベントのリッスン
    const handleUpdateAvailable = () => {
      setState((prev) => ({ ...prev, updateAvailable: true }));
    };

    window.addEventListener('sw-update-available', handleUpdateAvailable);

    // オンライン/オフライン状態の監視
    const handleOnline = () => {
      console.log('[ServiceWorker] App is online');
    };

    const handleOffline = () => {
      console.log('[ServiceWorker] App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdateAvailable);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const update = useCallback(async () => {
    if (registration) {
      setState((prev) => ({ ...prev, isUpdating: true }));
      await registration.update();
      setState((prev) => ({ ...prev, isUpdating: false, updateAvailable: false }));
    }
  }, [registration]);

  const skipWaiting = useCallback(() => {
    if (registration?.registration?.waiting) {
      registration.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }, [registration]);

  return {
    ...state,
    update,
    skipWaiting,
  };
}

/**
 * キャッシュをクリア
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if (!('caches' in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('[ServiceWorker] Cache cleared');
}

/**
 * 特定のURLのキャッシュを無効化
 */
export async function invalidateCache(url: string): Promise<void> {
  if (!('caches' in window)) return;

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(async (name) => {
      const cache = await caches.open(name);
      await cache.delete(url);
    })
  );
  console.log('[ServiceWorker] Cache invalidated for:', url);
}

/**
 * 現在のキャッシュ状態を取得
 */
export async function getCacheStatus(): Promise<{
  totalCaches: number;
  totalEntries: number;
  cacheNames: string[];
}> {
  if (!('caches' in window)) {
    return { totalCaches: 0, totalEntries: 0, cacheNames: [] };
  }

  const cacheNames = await caches.keys();
  let totalEntries = 0;

  for (const name of cacheNames) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    totalEntries += keys.length;
  }

  return {
    totalCaches: cacheNames.length,
    totalEntries,
    cacheNames,
  };
}

/**
 * Service Workerメッセージを送信
 */
export async function sendMessageToSW(message: object): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('No active service worker'));
      return;
    }

    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller.postMessage(message, [channel.port2]);
  });
}

/**
 * バックグラウンド同期を登録
 */
export async function registerBackgroundSync(tag: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.log('[ServiceWorker] Background sync not supported');
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  try {
    // Type assertion for Background Sync API
    const syncRegistration = registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } };
    await syncRegistration.sync.register(tag);
    console.log('[ServiceWorker] Background sync registered:', tag);
  } catch (error) {
    console.error('[ServiceWorker] Background sync registration failed:', error);
  }
}

/**
 * プッシュ通知を購読
 */
export async function subscribeToPushNotifications(
  publicVapidKey: string
): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[ServiceWorker] Push notifications not supported');
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey) as BufferSource,
    });

    console.log('[ServiceWorker] Push subscription created');
    return subscription;
  } catch (error) {
    console.error('[ServiceWorker] Push subscription failed:', error);
    return null;
  }
}

/**
 * Base64文字列をUint8Arrayに変換
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Service Worker状態を表示するコンポーネント用フック
 */
export function useServiceWorkerStatus() {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    isOfflineReady: false,
    cacheSize: 0,
  });

  useEffect(() => {
    const updateStatus = async () => {
      const cacheStatus = await getCacheStatus();
      setStatus((prev) => ({
        ...prev,
        cacheSize: cacheStatus.totalEntries,
      }));
    };

    updateStatus();

    const handleOnline = () => setStatus((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}
