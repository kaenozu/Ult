"""
PWA (Progressive Web App) サポート

プッシュ通知、オフライン対応、インストール可能なWebアプリ化。
"""

import json
import logging
from typing import Optional

import streamlit as st

logger = logging.getLogger(__name__)

# Service Worker スクリプト
SERVICE_WORKER_JS = """
const CACHE_NAME = 'agstock-v1';
const urlsToCache = [
    '/',
    '/static/style.css',
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('push', event => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'AGStock Alert';
    const options = {
        body: data.body || 'New notification',
        icon: '/static/icon-192.png',
        badge: '/static/badge-72.png',
        data: data.url || '/',
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data));
});
"""

# Manifest
MANIFEST = {
    "name": "AGStock Trading System",
    "short_name": "AGStock",
    "description": "AI-Powered Stock Trading System",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#0a0a1a",
    "theme_color": "#6366f1",
    "icons": [
        {"src": "/static/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "/static/icon-512.png", "sizes": "512x512", "type": "image/png"},
    ],
}


def inject_pwa_support():
    """PWAサポートをStreamlitに注入"""
    pwa_html = f"""
    <script>
        // Register Service Worker
        if ('serviceWorker' in navigator) {{
            window.addEventListener('load', () => {{
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => console.log('SW registered'))
                    .catch(err => console.log('SW registration failed:', err));
            }});
        }}
        
        // Request notification permission
        function requestNotificationPermission() {{
            if ('Notification' in window) {{
                Notification.requestPermission().then(permission => {{
                    console.log('Notification permission:', permission);
                }});
            }}
        }}
        
        // Show local notification
        function showNotification(title, body) {{
            if (Notification.permission === 'granted') {{
                new Notification(title, {{ body: body }});
            }}
        }}
        
        // Expose to Streamlit
        window.agstock = {{
            requestNotificationPermission,
            showNotification,
        }};
    </script>
    <link rel="manifest" href="/manifest.json">
    <meta name="theme-color" content="#6366f1">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    """
    st.markdown(pwa_html, unsafe_allow_html=True)


def send_browser_notification(title: str, body: str):
    """ブラウザ通知を送信（JavaScript経由）"""
    js_code = f"""
    <script>
        if (window.agstock) {{
            window.agstock.showNotification("{title}", "{body}");
        }}
    </script>
    """
    st.markdown(js_code, unsafe_allow_html=True)


class NotificationManager:
    """プッシュ通知マネージャー"""
    
    def __init__(self):
        self._subscription: Optional[dict] = None
    
    def is_supported(self) -> bool:
        """プッシュ通知がサポートされているか"""
        # ブラウザ側でチェックが必要なので、常にTrueを返す
        return True
    
    def request_permission(self):
        """通知許可をリクエスト"""
        js_code = """
        <script>
            if (window.agstock) {
                window.agstock.requestNotificationPermission();
            }
        </script>
        """
        st.markdown(js_code, unsafe_allow_html=True)
    
    def send_local(self, title: str, body: str):
        """ローカル通知を送信"""
        send_browser_notification(title, body)


# UIカスタマイズ機能
class ThemeManager:
    """テーママネージャー"""
    
    THEMES = {
        "dark": {
            "background": "#0a0a1a",
            "surface": "#1a1a2e",
            "primary": "#6366f1",
            "secondary": "#8b5cf6",
            "text": "#e2e8f0",
            "text_secondary": "#94a3b8",
        },
        "light": {
            "background": "#f8fafc",
            "surface": "#ffffff",
            "primary": "#4f46e5",
            "secondary": "#7c3aed",
            "text": "#1e293b",
            "text_secondary": "#64748b",
        },
        "navy": {
            "background": "#0f172a",
            "surface": "#1e293b",
            "primary": "#3b82f6",
            "secondary": "#06b6d4",
            "text": "#f1f5f9",
            "text_secondary": "#94a3b8",
        },
    }
    
    @classmethod
    def apply_theme(cls, theme_name: str = "dark"):
        """テーマを適用"""
        theme = cls.THEMES.get(theme_name, cls.THEMES["dark"])
        
        css = f"""
        <style>
            :root {{
                --bg-color: {theme['background']};
                --surface-color: {theme['surface']};
                --primary-color: {theme['primary']};
                --secondary-color: {theme['secondary']};
                --text-color: {theme['text']};
                --text-secondary: {theme['text_secondary']};
            }}
            
            .stApp {{
                background-color: var(--bg-color);
                color: var(--text-color);
            }}
            
            .stMetric {{
                background-color: var(--surface-color);
                border-radius: 8px;
                padding: 1rem;
            }}
            
            .stButton > button {{
                background-color: var(--primary-color);
                color: white;
                border: none;
                border-radius: 6px;
            }}
            
            .stButton > button:hover {{
                background-color: var(--secondary-color);
            }}
        </style>
        """
        st.markdown(css, unsafe_allow_html=True)
    
    @classmethod
    def get_theme_selector(cls) -> str:
        """テーマセレクターを表示"""
        return st.sidebar.selectbox(
            "🎨 テーマ",
            list(cls.THEMES.keys()),
            index=0,
        )
