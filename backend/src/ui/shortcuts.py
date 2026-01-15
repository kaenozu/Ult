"""キーボードショートカットモジュール

Ctrl+1~7でタブ切替、/で検索など
"""

import streamlit as st
import streamlit.components.v1 as components


class KeyboardShortcuts:
    """キーボードショートカット管理"""

    SHORTCUTS_JS = """
    <script>
    (function() {
        // 既存のリスナーを削除（重複防止）
        if (window._agstockShortcutsInitialized) return;
        window._agstockShortcutsInitialized = true;

        document.addEventListener('keydown', function(e) {
            // Ctrl/Cmd + 数字でタブ切替
            if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                const tabs = document.querySelectorAll('[data-baseweb="tab"]');
                if (tabs[tabIndex]) {
                    tabs[tabIndex].click();
                    showToast(`タブ ${e.key} に切替`);
                }
            }

            // / で検索フォーカス
            if (e.key === '/' && !isInputFocused()) {
                e.preventDefault();
                const searchInput = document.querySelector('input[type="text"]');
                if (searchInput) {
                    searchInput.focus();
                    showToast('検索モード');
                }
            }

            // Escape でモーダルを閉じる
            if (e.key === 'Escape') {
                const closeButtons = document.querySelectorAll('[aria-label="Close"]');
                closeButtons.forEach(btn => btn.click());
            }

            // Ctrl/Cmd + R でリフレッシュ（ページリロードを防止）
            if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
                e.preventDefault();
                const refreshBtn = document.querySelector('button[kind="secondary"]');
                if (refreshBtn && refreshBtn.textContent.includes('更新')) {
                    refreshBtn.click();
                    showToast('データを更新中...');
                } else {
                    // Streamlitのrerunをトリガー
                    window.parent.postMessage({type: 'streamlit:rerun'}, '*');
                    showToast('リフレッシュ中...');
                }
            }

            // Ctrl/Cmd + S でスクリーンショット（ページ保存を防止）
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                showToast('スクリーンショット: ブラウザのデベロッパーツールを使用してください');
            }

            // ? でショートカットヘルプ表示
            if (e.key === '?' && !isInputFocused()) {
                e.preventDefault();
                showShortcutHelp();
            }

            // H でホーム（ダッシュボード）に戻る
            if (e.key === 'h' && !isInputFocused() && !e.ctrlKey && !e.metaKey) {
                const tabs = document.querySelectorAll('[data-baseweb="tab"]');
                if (tabs[0]) {
                    tabs[0].click();
                    showToast('ダッシュボードに移動');
                }
            }

            // J/K でスクロール
            if (e.key === 'j' && !isInputFocused()) {
                window.scrollBy(0, 100);
            }
            if (e.key === 'k' && !isInputFocused()) {
                window.scrollBy(0, -100);
            }

            // G + G でトップにスクロール
            if (e.key === 'g' && !isInputFocused()) {
                if (window._lastKeyG) {
                    window.scrollTo(0, 0);
                    showToast('トップに移動');
                    window._lastKeyG = false;
                } else {
                    window._lastKeyG = true;
                    setTimeout(() => { window._lastKeyG = false; }, 500);
                }
            }

            // Shift + G でボトムにスクロール
            if (e.key === 'G' && !isInputFocused()) {
                window.scrollTo(0, document.body.scrollHeight);
                showToast('ボトムに移動');
            }
        });

        function isInputFocused() {
            const active = document.activeElement;
            return active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
        }

        function showToast(message) {
            // 既存のトーストを削除
            const existing = document.getElementById('agstock-toast');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.id = 'agstock-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(15, 23, 42, 0.95);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                z-index: 9999;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                border: 1px solid rgba(255,255,255,0.1);
                animation: fadeIn 0.2s ease;
            `;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'fadeOut 0.2s ease';
                setTimeout(() => toast.remove(), 200);
            }, 2000);
        }

        function showShortcutHelp() {
            const helpModal = document.createElement('div');
            helpModal.id = 'agstock-shortcut-help';
            helpModal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            `;
            helpModal.innerHTML = `
                <div style="background: #1e293b; border-radius: 16px; padding: 24px; max-width: 500px; color: white;">
                    <h3 style="margin-top:0;">⌨️ キーボードショートカット</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><kbd>Ctrl+1~7</kbd></td><td>タブ切替</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><kbd>/</kbd></td><td>検索</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><kbd>Ctrl+R</kbd></td><td>リフレッシュ</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><kbd>H</kbd></td><td>ダッシュボードに移動</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><kbd>J/K</kbd></td><td>上下スクロール</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><kbd>G G</kbd></td><td>トップに移動</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><kbd>Shift+G</kbd></td><td>ボトムに移動</td></tr>
                        <tr><td style="padding: 8px; border-bottom: 1px solid #374151;"><kbd>Escape</kbd></td><td>モーダルを閉じる</td></tr>
                        <tr><td style="padding: 8px;"><kbd>?</kbd></td><td>このヘルプを表示</td></tr>
                    </table>
                    <p style="text-align: center; margin-top: 16px; color: #94a3b8;">Escapeで閉じる</p>
                </div>
            `;
            helpModal.onclick = () => helpModal.remove();
            document.body.appendChild(helpModal);
        }

        // CSSアニメーション追加
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(10px); } }
            kbd { background: #374151; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
        `;
        document.head.appendChild(style);

        console.log('⌨️ AGStock keyboard shortcuts initialized. Press ? for help.');
    })();
    </script>
    """

    @classmethod
    def inject_listener(cls):
        """キーボードリスナーを注入"""
        components.html(cls.SHORTCUTS_JS, height=0)

    @classmethod
    def render_help_button(cls):
        """ショートカットヘルプボタンをレンダリング"""
        with st.sidebar:
            with st.expander("⌨️ ショートカット", expanded=False):
                st.markdown(
                    """
                | キー | アクション |
                |------|----------|
                | `Ctrl+1~7` | タブ切替 |
                | `/` | 検索 |
                | `Ctrl+R` | リフレッシュ |
                | `H` | ホーム |
                | `J/K` | スクロール |
                | `?` | ヘルプ |
                """
                )
