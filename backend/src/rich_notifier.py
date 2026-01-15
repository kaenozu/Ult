"""
Rich Notification System
リッチメッセージ（チャート画像付き）通知システム
"""

import pandas as pd
from typing import Dict, List, Optional
from datetime import datetime
from io import BytesIO

import matplotlib
import matplotlib.pyplot as plt
import requests

matplotlib.use("Agg")  # バックエンド設定


class RichNotifier:
    """リッチメッセージ送信クラス"""

    def __init__(self):
        """初期化"""
        self.line_token = None
        self.discord_webhook = None

        # config.jsonから設定読み込み
        try:
            import json

            with open("config.json", "r", encoding="utf-8") as f:
                config = json.load(f)
                line_config = config.get("notifications", {}).get("line", {})
                discord_config = config.get("notifications", {}).get("discord", {})

                if line_config.get("enabled", False):
                    self.line_token = line_config.get("token", "")

                if discord_config.get("enabled", False):
                    self.discord_webhook = discord_config.get("webhook_url", "")
        except Exception as e:
            print(f"通知設定の読み込みエラー: {e}")

    def create_mini_chart(self, ticker: str, price: float, data: Optional[pd.DataFrame] = None) -> BytesIO:
        """
        ミニチャートを生成

        Args:
            ticker: 銘柄コード
            price: 現在価格
            data: 価格データ（オプション）

        Returns:
            画像バイナリ
        """
        fig, ax = plt.subplots(figsize=(6, 3), facecolor="#1f2937")
        ax.set_facecolor("#1f2937")

        if data is not None and not data.empty:
            # 実際のデータをプロット
            ax.plot(data.index, data["Close"], color="#00d4ff", linewidth=2)
            ax.fill_between(data.index, data["Close"], alpha=0.3, color="#00d4ff")
        else:
            # ダミーデータ
            import numpy as np

            x = range(30)
            y = np.random.randn(30).cumsum() + 100
            ax.plot(x, y, color="#00d4ff", linewidth=2)
            ax.fill_between(x, y, alpha=0.3, color="#00d4ff")

        ax.set_title(f"{ticker} - ¥{price:,.0f}", color="white", fontsize=14, fontweight="bold")
        ax.tick_params(colors="white")
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["bottom"].set_color("white")
        ax.spines["left"].set_color("white")
        ax.grid(True, alpha=0.2, color="white")

        # バイナリに保存
        img_buffer = BytesIO()
        plt.tight_layout()
        plt.savefig(img_buffer, format="png", facecolor="#1f2937", dpi=100)
        plt.close(fig)
        img_buffer.seek(0)

        return img_buffer

    def send_line_notify(self, message: str, image_buffer: Optional[BytesIO] = None) -> bool:
        """
        LINE Notifyでメッセージ送信

        Args:
            message: メッセージ本文
            image_buffer: 画像バイナリ（オプション）

        Returns:
            成功したかどうか
        """
        if not self.line_token:
            return False

        url = "https://notify-api.line.me/api/notify"
        headers = {"Authorization": f"Bearer {self.line_token}"}

        payload = {"message": message}
        files = {}

        if image_buffer:
            files = {"imageFile": image_buffer}

        try:
            response = requests.post(url, headers=headers, data=payload, files=files)
            return response.status_code == 200
        except Exception as e:
            print(f"LINE通知エラー: {e}")
            return False

    def send_discord_webhook(self, message: str, embeds: Optional[List[Dict]] = None) -> bool:
        """
        Discord Webhookでメッセージ送信

        Args:
            message: メッセージ本文
            embeds: Embed情報（オプション）

        Returns:
            成功したかどうか
        """
        if not self.discord_webhook:
            return False

        payload = {"content": message}

        if embeds:
            payload["embeds"] = embeds

        try:
            response = requests.post(self.discord_webhook, json=payload)
            return response.status_code == 204
        except Exception as e:
            print(f"Discord通知エラー: {e}")
            return False

    def send_signal_alert(
        self,
        ticker: str,
        name: str,
        action: str,
        price: float,
        reason: str,
        strategy: str,
        data: Optional[pd.DataFrame] = None,
    ) -> bool:
        """
        トレードシグナルアラートを送信

        Args:
            ticker: 銘柄コード
            name: 銘柄名
            action: アクション（BUY/SELL）
            price: 価格
            reason: 理由
            strategy: 戦略名
            data: 価格データ

        Returns:
            成功したかどうか
        """
        # シグナルの絵文字
        emoji = "🚀" if action == "BUY" else "📉"

        # メッセージ作成
        message = f"""
{emoji} {action}シグナル検出！

📊 銘柄: {name} ({ticker})
💰 価格: ¥{price:,.0f}
🎯 戦略: {strategy}
📝 理由: {reason}

⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
""".strip()

        success = False

        # LINE通知（画像付き）
        if self.line_token:
            img_buffer = self.create_mini_chart(ticker, price, data)
            success = self.send_line_notify(message, img_buffer) or success

        # Discord通知（Embed付き）
        if self.discord_webhook:
            color = 0x00FF00 if action == "BUY" else 0xFF0000
            embeds = [
                {
                    "title": f"{emoji} {action}シグナル",
                    "description": f"**{name}** ({ticker})",
                    "color": color,
                    "fields": [
                        {"name": "価格", "value": f"¥{price:,.0f}", "inline": True},
                        {"name": "戦略", "value": strategy, "inline": True},
                        {"name": "理由", "value": reason, "inline": False},
                    ],
                    "footer": {"text": f"AGStock | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"},
                }
            ]
            success = self.send_discord_webhook(message, embeds) or success

        return success

    def send_daily_summary(
        self,
        total_signals: int,
        buy_signals: int,
        sell_signals: int,
        top_picks: List[Dict],
    ) -> bool:
        """
        日次サマリーを送信

        Args:
            total_signals: 総シグナル数
            buy_signals: 買いシグナル数
            sell_signals: 売りシグナル数
            top_picks: トップピック一覧

        Returns:
            成功したかどうか
        """
        message = f"""
📊 本日のスキャン結果

✅ 検出シグナル: {total_signals}件
🚀 買い: {buy_signals}件
📉 売り: {sell_signals}件

🏆 トップ3ピック:
        """.strip()

        for i, pick in enumerate(top_picks[:3], 1):
            message += f"\n{i}. {pick['name']} ({pick['ticker']}) - {pick['action']}"

        message += f"\n\n⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"

        success = False

        if self.line_token:
            success = self.send_line_notify(message) or success

        if self.discord_webhook:
            embeds = [
                {
                    "title": "📊 本日のスキャン結果",
                    "color": 0x00D4FF,
                    "fields": [
                        {
                            "name": "総シグナル数",
                            "value": f"{total_signals}件",
                            "inline": True,
                        },
                        {
                            "name": "買いシグナル",
                            "value": f"{buy_signals}件",
                            "inline": True,
                        },
                        {
                            "name": "売りシグナル",
                            "value": f"{sell_signals}件",
                            "inline": True,
                        },
                    ],
                    "footer": {"text": f"AGStock | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"},
                }
            ]

            # トップピックを追加
            if top_picks:
                top_picks_text = "\n".join(
                    [
                        f"{i}. **{pick['name']}** ({pick['ticker']}) - {pick['action']}"
                        for i, pick in enumerate(top_picks[:3], 1)
                    ]
                )
                embeds[0]["fields"].append(
                    {
                        "name": "🏆 トップ3ピック",
                        "value": top_picks_text,
                        "inline": False,
                    }
                )

            success = self.send_discord_webhook("", embeds) or success

        return success


if __name__ == "__main__":
    # テスト
    notifier = RichNotifier()

    # シグナルテスト
    notifier.send_signal_alert(
        ticker="7203.T",
        name="トヨタ自動車",
        action="BUY",
        price=2500,
        reason="RSI oversold + MACD crossover",
        strategy="Combined Strategy",
        data=None,
    )

    # サマリーテスト
    notifier.send_daily_summary(
        total_signals=15,
        buy_signals=10,
        sell_signals=5,
        top_picks=[
            {"ticker": "7203.T", "name": "トヨタ自動車", "action": "BUY"},
            {"ticker": "9984.T", "name": "ソフトバンクグループ", "action": "BUY"},
            {"ticker": "6758.T", "name": "ソニーグループ", "action": "SELL"},
        ],
    )
