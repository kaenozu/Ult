/**
 * Service Worker
 * 
 * オフライン対応とリソースキャッシング
 * パフォーマンス向上とユーザー体験の改善
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

// キャッシュ名（バージョン管理）
const CACHE_VERSION = 'v1';
const STATIC_CACHE = `ult-static-${CACHE_VERSION}`;
const API_CACHE = `ult-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `ult-images-${CACHE_VERSION}`;

// プリキャッシュする静的アセット
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  // 主要なJS/CSSチャンクはビルド時に自動的に追加される
];

// キャッシュ戦略
enum CacheStrategy {
  CACHE_FIRST = 'cache-first',      // キャッシュ優先（静的アセット）
  NETWORK_FIRST = 'network-first',  // ネットワーク優先（API）
  STALE_WHILE_REVALIDATE = 'stale-while-revalidate', // キャッシュ返却後に更新
  NETWORK_ONLY = 'network-only',    // キャッシュしない
}

// ルート別のキャッシュ戦略
const ROUTE_STRATEGIES: { pattern: RegExp; strategy: CacheStrategy; ttl: number }[] = [
  // 静的アセット
  { pattern: /\.(js|css|woff|woff2)$/, strategy: CacheStrategy.CACHE_FIRST, ttl: 30 * 24 * 60 * 60 * 1000 }, // 30日
  // 画像
  { pattern: /\.(png|jpg|jpeg|gif|svg|webp|avif)$/, strategy: CacheStrategy.STALE_WHILE_REVALIDATE, ttl: 7 * 24 * 60 * 60 * 1000 }, // 7日
  // API: 市場データ
  { pattern: /\/api\/market/, strategy: CacheStrategy.STALE_WHILE_REVALIDATE, ttl: 60 * 1000 }, // 1分
  // API: シグナル
  { pattern: /\/api\/signal/, strategy: CacheStrategy.NETWORK_FIRST, ttl: 30 * 1000 }, // 30秒
  // API: ポートフォリオ
  { pattern: /\/api\/portfolio/, strategy: CacheStrategy.NETWORK_ONLY, ttl: 0 }, // キャッシュしない
];

/**
 * Service Workerインストール
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[ServiceWorker] Pre-caching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Pre-cache failed:', error);
      })
  );
});

/**
 * Service Workerアクティベート
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        // 古いキャッシュを削除
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('ult-') && !name.includes(CACHE_VERSION);
            })
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Claiming clients');
        return self.clients.claim();
      })
  );
});

/**
 * フェッチイベント処理
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 自分自身のoriginのみキャッシュ
  if (url.origin !== self.location.origin) {
    return;
  }

  // 戦略を決定
  const strategy = getStrategyForUrl(url);

  if (strategy === CacheStrategy.NETWORK_ONLY) {
    return;
  }

  event.respondWith(handleRequest(request, strategy));
});

/**
 * URLに応じた戦略を取得
 */
function getStrategyForUrl(url: URL): CacheStrategy {
  const path = url.pathname;

  for (const route of ROUTE_STRATEGIES) {
    if (route.pattern.test(path)) {
      return route.strategy;
    }
  }

  return CacheStrategy.NETWORK_FIRST;
}

/**
 * リクエストを処理
 */
async function handleRequest(
  request: Request,
  strategy: CacheStrategy
): Promise<Response> {
  switch (strategy) {
    case CacheStrategy.CACHE_FIRST:
      return handleCacheFirst(request);
    case CacheStrategy.NETWORK_FIRST:
      return handleNetworkFirst(request);
    case CacheStrategy.STALE_WHILE_REVALIDATE:
      return handleStaleWhileRevalidate(request);
    default:
      return fetch(request);
  }
}

/**
 * Cache-First戦略
 * キャッシュにあればそれを返し、なければネットワークから取得
 */
async function handleCacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // オフラインかつキャッシュがない場合
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-First戦略
 * まずネットワークを試し、失敗したらキャッシュを返す
 */
async function handleNetworkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

/**
 * Stale-While-Revalidate戦略
 * キャッシュを即座に返し、バックグラウンドで更新
 */
async function handleStaleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(request);

  // バックグラウンドで更新
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => {
      // ネットワークエラーは無視
    });

  // キャッシュがあれば即座に返す
  if (cached) {
    // 古すぎる場合はネットワークを待つ
    const cacheTime = cached.headers.get('sw-cache-time');
    if (cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      const maxAge = getMaxAgeForRequest(request);

      if (age < maxAge) {
        return cached;
      }
    } else {
      return cached;
    }
  }

  // キャッシュがないか古い場合はネットワークを待つ
  try {
    const response = await fetchPromise;
    if (response) {
      // キャッシュ時間ヘッダーを追加
      const headers = new Headers(response.headers);
      headers.set('sw-cache-time', Date.now().toString());

      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });

      return modifiedResponse;
    }
  } catch (error) {
    // ネットワークエラー
  }

  // 最終的にキャッシュを返す
  if (cached) {
    return cached;
  }

  throw new Error('Network error and no cache available');
}

/**
 * リクエストに応じた最大キャッシュ期間を取得
 */
function getMaxAgeForRequest(request: Request): number {
  const url = new URL(request.url);

  for (const route of ROUTE_STRATEGIES) {
    if (route.pattern.test(url.pathname)) {
      return route.ttl;
    }
  }

  return 60 * 1000; // デフォルト1分
}

/**
 * バックグラウンド同期
 * オンライン復帰時に保留中のリクエストを再試行
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-portfolio-updates') {
    event.waitUntil(syncPortfolioUpdates());
  }
});

async function syncPortfolioUpdates(): Promise<void> {
  // IndexedDBから保留中の更新を取得して送信
  console.log('[ServiceWorker] Syncing portfolio updates');
  // 実装はアプリケーション側と連携
}

/**
 * プッシュ通知（将来の拡張用）
 */
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};

  event.waitUntil(
    self.registration.showNotification(data.title || 'Ult Trading', {
      body: data.body || '',
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: data,
    })
  );
});

/**
 * 通知クリック（将来の拡張用）
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.openWindow('/').then((windowClient) => {
      // 通知データに応じた画面遷移
      if (event.notification.data?.url) {
        windowClient?.navigate(event.notification.data.url);
      }
    })
  );
});

// Service Workerスコープの型エクスポート
export {};
