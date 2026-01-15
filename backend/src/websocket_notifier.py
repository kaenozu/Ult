"""
WebSocketリアルタイム通知システム
取引シグナル、市場アラート、ポートフォリオ更新をリアルタイム通知
"""

import asyncio
import websockets
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Set, Callable
import streamlit as st
import plotly.graph_objects as go

logger = logging.getLogger(__name__)


class WebSocketManager:
    """WebSocket接続管理クラス"""

    def __init__(self):
        self.connections: Set[websockets.WebSocketServerProtocol] = set()
        self.port = 8765
        self.running = False
        self.notification_handlers = {}

    async def register_handler(self, notification_type: str, handler: Callable):
        """通知ハンドラーを登録"""
        self.notification_handlers[notification_type] = handler

    async def start_server(self):
        """WebSocketサーバーを起動"""
        self.running = True

        server = await websockets.serve(self.handle_client, "localhost", self.port)

        logger.info(f"WebSocket server started on port {self.port}")
        return server

    async def handle_client(self, websocket, path):
        """クライアント接続を処理"""
        self.connections.add(websocket)
        logger.info(f"Client connected: {websocket.remote_address}")

        try:
            await websocket.send(
                json.dumps(
                    {
                        "type": "connection_established",
                        "message": "WebSocket接続が確立されました",
                        "timestamp": datetime.now().isoformat(),
                    }
                )
            )

            # クライアントからのメッセージを待機
            async for message in websocket:
                await self.process_client_message(websocket, message)

        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client disconnected: {websocket.remote_address}")
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            self.connections.discard(websocket)

    async def process_client_message(self, websocket, message):
        """クライアントからのメッセージを処理"""
        try:
            data = json.loads(message)
            message_type = data.get("type")

            if message_type == "subscribe":
                # 特定の通知を購読
                subscription = data.get("subscription", "all")
                await self.handle_subscription(websocket, subscription)

            elif message_type == "ping":
                # 生存確認
                await websocket.send(json.dumps({"type": "pong", "timestamp": datetime.now().isoformat()}))

        except json.JSONDecodeError:
            await websocket.send(json.dumps({"type": "error", "message": "Invalid JSON format"}))

    async def handle_subscription(self, websocket, subscription):
        """通知購読を処理"""
        await websocket.send(
            json.dumps(
                {
                    "type": "subscription_confirmed",
                    "subscription": subscription,
                    "message": f"{subscription}の通知を購読しました",
                    "timestamp": datetime.now().isoformat(),
                }
            )
        )

    async def broadcast(self, message: Dict):
        """すべてのクライアントにメッセージを配信"""
        if not self.connections:
            return

        message_str = json.dumps(message)

        # 並列で送信
        tasks = []
        for websocket in self.connections.copy():
            try:
                tasks.append(websocket.send(message_str))
            except websockets.exceptions.ConnectionClosed:
                self.connections.discard(websocket)

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def send_notification(self, notification_type: str, data: Dict):
        """特定タイプの通知を送信"""
        notification = {
            "type": notification_type,
            "data": data,
            "timestamp": datetime.now().isoformat(),
        }

        await self.broadcast(notification)

        # 登録されたハンドラーを呼び出し
        if notification_type in self.notification_handlers:
            try:
                await self.notification_handlers[notification_type](data)
            except Exception as e:
                logger.error(f"Notification handler error: {e}")

    async def stop_server(self):
        """サーバーを停止"""
        self.running = False
        self.connections.clear()
        logger.info("WebSocket server stopped")


class RealTimeNotifier:
    """リアルタイム通知管理クラス"""

    def __init__(self, websocket_manager: WebSocketManager):
        self.ws_manager = websocket_manager
        self.notification_queue = asyncio.Queue()
        self.price_alerts = {}
        self.portfolio_thresholds = {
            "daily_change": 0.05,  # 5%変動
            "position_change": 0.10,  # 10%変動
            "total_value_change": 50000,  # 5万円変動
        }

    async def setup_price_alerts(self, tickers: List[str]):
        """価格アラートを設定"""
        for ticker in tickers:
            self.price_alerts[ticker] = {
                "high": None,
                "low": None,
                "current": None,
                "notification_sent": False,
            }

    async def check_price_alerts(self, market_data: Dict[str, float]):
        """価格アラートをチェック"""
        for ticker, price in market_data.items():
            if ticker not in self.price_alerts:
                continue

            alert = self.price_alerts[ticker]
            previous_price = alert["current"]

            if previous_price:
                # 高値・安値を更新
                alert["high"] = max(alert["high"], previous_price, price)
                alert["low"] = min(alert["low"], previous_price, price)

                # 前日比変動を計算
                daily_change = (price - previous_price) / previous_price

                # 5%以上の変動で通知
                if abs(daily_change) >= self.portfolio_thresholds["daily_change"]:
                    direction = "上昇" if daily_change > 0 else "下落"

                    await self.ws_manager.send_notification(
                        "price_alert",
                        {
                            "ticker": ticker,
                            "current_price": price,
                            "previous_price": previous_price,
                            "daily_change_pct": daily_change * 100,
                            "direction": direction,
                            "message": f"{ticker}が{abs(daily_change) * 100:.1f}%{direction}しました（前日終値: {previous_price}円→現在: {price}円）",
                        },
                    )

                    alert["notification_sent"] = True

            alert["current"] = price

    async def check_portfolio_alerts(self, portfolio_data: Dict):
        """ポートフォリオアラートをチェック"""
        total_value = portfolio_data.get("total_value", 0)
        previous_value = portfolio_data.get("previous_total_value", 0)

        if previous_value > 0:
            total_change = total_value - previous_value
            change_pct = total_change / previous_value

            # 大幅な変動で通知
            if abs(total_change) >= self.portfolio_thresholds["total_value_change"]:
                direction = "増加" if total_change > 0 else "減少"

                await self.ws_manager.send_notification(
                    "portfolio_alert",
                    {
                        "type": "large_value_change",
                        "current_value": total_value,
                        "previous_value": previous_value,
                        "total_change": total_change,
                        "change_pct": change_pct * 100,
                        "direction": direction,
                        "message": f"ポートフォリオ総資産が{direction}しました（{previous_value:,}円→{total_value:,}円、変動: {total_change:+,}円）",
                    },
                )

    async def send_trade_notification(self, trade_data: Dict):
        """取引通知を送信"""
        await self.ws_manager.send_notification(
            "trade_execution",
            {
                "ticker": trade_data.get("ticker"),
                "action": trade_data.get("action"),
                "quantity": trade_data.get("quantity"),
                "price": trade_data.get("price"),
                "total_value": trade_data.get("total_value"),
                "status": trade_data.get("status"),
                "message": f"{trade_data.get('action')}注文が実行されました: {trade_data.get('ticker')} {trade_data.get('quantity')}株 @ {trade_data.get('price')}円",
            },
        )

    async def send_market_alert(self, alert_data: Dict):
        """市場アラートを送信"""
        await self.ws_manager.send_notification(
            "market_alert",
            {
                "alert_type": alert_data.get("type"),
                "severity": alert_data.get("severity", "medium"),
                "message": alert_data.get("message"),
                "data": alert_data.get("data", {}),
            },
        )

    async def send_system_notification(self, message: str, notification_type: str = "info"):
        """システム通知を送信"""
        await self.ws_manager.send_notification(
            "system",
            {
                "type": notification_type,
                "message": message,
                "timestamp": datetime.now().isoformat(),
            },
        )


class NotificationUI:
    """通知UI表示クラス"""

    def __init__(self):
        self.notifications = []
        self.active_subscriptions = set(["all"])

    def show_notification_panel(self):
        """通知パネルを表示"""
        st.subheader("🔔 リアルタイム通知")

        # 接続状態
        connection_status = self.check_websocket_connection()

        if connection_status:
            st.success("✅ WebSocket接続済み")
        else:
            st.warning("⚠️ WebSocket未接続")
            if st.button("🔄 再接続"):
                st.experimental_rerun()

        # 購読設定
        st.markdown("### 🔕 通知購読")

        col1, col2, col3 = st.columns(3)

        with col1:
            all_sub = st.checkbox("すべての通知", value="all" in self.active_subscriptions)
            if all_sub != ("all" in self.active_subscriptions):
                if all_sub:
                    self.active_subscriptions.add("all")
                else:
                    self.active_subscriptions.discard("all")

        with col2:
            trade_sub = st.checkbox("取引通知", value="trade" in self.active_subscriptions)
            if trade_sub != ("trade" in self.active_subscriptions):
                if trade_sub:
                    self.active_subscriptions.add("trade")
                else:
                    self.active_subscriptions.discard("trade")

        with col3:
            alert_sub = st.checkbox("市場アラート", value="market" in self.active_subscriptions)
            if alert_sub != ("market" in self.active_subscriptions):
                if alert_sub:
                    self.active_subscriptions.add("market")
                else:
                    self.active_subscriptions.discard("market")

        # 通知履歴
        st.markdown("### 📋 通知履歴")

        if self.notifications:
            for notification in reversed(self.notifications[-10:]):  # 最新10件
                self.render_notification(notification)
        else:
            st.info("通知はありません")

        # 通知テスト
        st.markdown("### 🧪 通知テスト")

        col1, col2 = st.columns(2)

        with col1:
            if st.button("🔔 テスト通知送信"):
                test_notification = {
                    "type": "test",
                    "message": "これはテスト通知です",
                    "timestamp": datetime.now().isoformat(),
                }
                self.add_notification(test_notification)
                st.success("テスト通知を送信しました")

        with col2:
            if st.button("🗑️ 通知履歴をクリア"):
                self.notifications.clear()
                st.success("通知履歴をクリアしました")

    def render_notification(self, notification: Dict):
        """通知を描画"""
        notification_type = notification.get("type", "info")
        message = notification.get("message", "")
        timestamp = notification.get("timestamp", "")

        # 通知タイプによるアイコンと色
        type_config = {
            "price_alert": {"icon": "📈", "color": "blue"},
            "portfolio_alert": {"icon": "💰", "color": "green"},
            "trade_execution": {"icon": "🔄", "color": "purple"},
            "market_alert": {"icon": "⚠️", "color": "orange"},
            "system": {"icon": "ℹ️", "color": "gray"},
            "test": {"icon": "🧪", "color": "cyan"},
        }

        config = type_config.get(notification_type, {"icon": "📢", "color": "gray"})

        st.markdown(
            f"""
        <div style="padding: 10px; margin: 5px 0; border-left: 4px solid {config["color"]}; background: #f8f9fa;">
            <strong>{config["icon"]} {notification_type.replace("_", " ").title()}</strong><br>
            <small>{message}</small><br>
            <small style="color: #666;">{timestamp}</small>
        </div>
        """,
            unsafe_allow_html=True,
        )

    def add_notification(self, notification: Dict):
        """通知を追加"""
        self.notifications.append(notification)

        # 最大100件に制限
        if len(self.notifications) > 100:
            self.notifications = self.notifications[-100:]

    def check_websocket_connection(self) -> bool:
        """WebSocket接続をチェック"""
        # 実際の接続チェックロジックを実装
        return st.session_state.get("websocket_connected", False)


# グローバルインスタンス
websocket_manager = WebSocketManager()
realtime_notifier = RealTimeNotifier(websocket_manager)
notification_ui = NotificationUI()


async def start_websocket_server():
    """WebSocketサーバーを開始"""
    server = await websocket_manager.start_server()

    try:
        await server.serve_forever()
    except KeyboardInterrupt:
        logger.info("WebSocket server stopped by user")
    finally:
        await websocket_manager.stop_server()


def show_realtime_notifications_page():
    """リアルタイム通知ページを表示"""
    st.title("🔔 リアルタイム通知設定")
    st.markdown("WebSocketによるリアルタイム通知とアラートシステム")

    notification_ui.show_notification_panel()

    # 設定パネル
    st.markdown("---")
    st.subheader("⚙️ 通知設定")

    # 価格アラート設定
    st.markdown("### 📈 価格アラート")

    col1, col2 = st.columns(2)

    with col1:
        price_threshold = st.number_input(
            "価格変動率（%）",
            min_value=1.0,
            max_value=50.0,
            value=5.0,
            step=0.5,
            key="price_threshold",
        )

    with col2:
        portfolio_threshold = st.number_input(
            "資産変動額（円）",
            min_value=1000,
            max_value=1000000,
            value=50000,
            step=5000,
            key="portfolio_threshold",
        )

    # 通知方法設定
    st.markdown("### 🔕 通知方法")

    col1, col2 = st.columns(2)

    with col1:
        st.checkbox("ブラウザ通知", value=True, key="browser_notify")
        st.checkbox("音声通知", value=False, key="sound_notify")

    with col2:
        st.checkbox("メール通知", value=False, key="email_notify")
        st.checkbox("LINE通知", value=False, key="line_notify")

    # テスト用のモニタリング
    if st.checkbox("🔍 デバッグモード", key="debug_mode"):
        st.subheader("🔍 接続状況モニター")

        # サンプル通知送信ボタン
        col1, col2, col3 = st.columns(3)

        with col1:
            if st.button("📈 価格アラートテスト"):
                asyncio.run(
                    realtime_notifier.send_market_alert(
                        {
                            "type": "price_change",
                            "severity": "high",
                            "message": "テスト: 価格が大幅に変動しました",
                            "data": {"ticker": "7203", "change": "+5.2%"},
                        }
                    )
                )

        with col2:
            if st.button("🔄 取引通知テスト"):
                asyncio.run(
                    realtime_notifier.send_trade_notification(
                        {
                            "ticker": "6758",
                            "action": "BUY",
                            "quantity": 100,
                            "price": 12500,
                            "total_value": 1250000,
                            "status": "executed",
                        }
                    )
                )

        with col3:
            if st.button("⚠️ 市場アラートテスト"):
                asyncio.run(realtime_notifier.send_system_notification("テスト: 市場に重要な変化があります", "warning"))


if __name__ == "__main__":
    show_realtime_notifications_page()
