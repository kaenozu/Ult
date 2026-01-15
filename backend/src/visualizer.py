import logging
import os

import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import pandas as pd

logger = logging.getLogger(__name__)


class ReportVisualizer:
    """
    日次レポート用のチャート画像を生成するクラス
    Matplotlibを使用して静的な画像を生成する
    """

    def __init__(self, output_dir: str = "logs/images"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

        # ダークモードスタイル適用
        try:
            plt.style.use("dark_background")
        except Exception as e:
            logger.warning(f"Failed to apply dark background style: {e}")

    def generate_equity_chart(self, history_df: pd.DataFrame, filename: str = "equity_chart.png") -> str:
        """
        資産推移チャートを生成する

        Args:
            history_df: 取引履歴または資産履歴のDataFrame
                        columns: ['date' or 'timestamp', 'total_equity']
            filename: 出力ファイル名

        Returns:
            str: 生成された画像のパス
        """
        try:
            if history_df.empty:
                return None

            # データ整形
            df = history_df.copy()

            # 日付カラムの特定
            date_col = None
            if "timestamp" in df.columns:
                date_col = "timestamp"
            elif "date" in df.columns:
                date_col = "date"

            if not date_col or "total_equity" not in df.columns:
                logger.warning("Required columns not found for equity chart")
                return None

            df[date_col] = pd.to_datetime(df[date_col])
            df = df.sort_values(date_col)

            # プロット作成
            fig, ax = plt.subplots(figsize=(10, 5))

            # 背景色設定（よりモダンなダークカラー）
            fig.patch.set_facecolor("#0E1117")
            ax.set_facecolor("#0E1117")

            # グリッド
            ax.grid(True, linestyle="--", alpha=0.3, color="#444444")

            # データプロット
            ax.plot(
                df[date_col],
                df["total_equity"],
                color="#00CCFF",
                linewidth=2,
                label="Total Equity",
            )
            ax.fill_between(
                df[date_col],
                df["total_equity"],
                df["total_equity"].min(),
                color="#00CCFF",
                alpha=0.1,
            )

            # タイトルとラベル
            ax.set_title("Portfolio Equity History", color="white", fontsize=14, pad=15)
            ax.set_ylabel("Equity (JPY)", color="#AAAAAA")

            # 軸のフォーマット
            ax.tick_params(axis="x", colors="#AAAAAA")
            ax.tick_params(axis="y", colors="#AAAAAA")

            # 日付フォーマット
            ax.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d"))
            plt.xticks(rotation=45)

            # 金額フォーマット（Y軸）
            ax.yaxis.set_major_formatter(plt.FuncFormatter(lambda x, p: f"¥{int(x):,}"))

            # レイアウト調整
            plt.tight_layout()

            # 保存
            output_path = os.path.join(self.output_dir, filename)
            plt.savefig(output_path, dpi=100, bbox_inches="tight", facecolor="#0E1117")
            plt.close()

            return output_path

        except Exception as e:
            logger.error(f"Failed to generate equity chart: {e}")
            return None

    def generate_pnl_bar_chart(self, daily_pnl: float, filename: str = "daily_pnl.png") -> str:
        """
        日次損益のバーチャートを生成する（シンプル版）

        Args:
            daily_pnl: 本日の損益額
            filename: 出力ファイル名

        Returns:
            str: 生成された画像のパス
        """
        try:
            fig, ax = plt.subplots(figsize=(6, 4))

            # 背景色
            fig.patch.set_facecolor("#0E1117")
            ax.set_facecolor("#0E1117")

            # 色決定
            color = "#00FF00" if daily_pnl >= 0 else "#FF0000"

            # バープロット
            bars = ax.bar(["Today"], [daily_pnl], color=color, width=0.4)

            # 値の表示
            for bar in bars:
                height = bar.get_height()
                ax.text(
                    bar.get_x() + bar.get_width() / 2.0,
                    height,
                    f"¥{int(daily_pnl):+,}",
                    ha="center",
                    va="bottom" if daily_pnl >= 0 else "top",
                    color="white",
                    fontsize=16,
                    fontweight="bold",
                )

            # ゼロライン
            ax.axhline(0, color="white", linewidth=1)

            # タイトル
            ax.set_title("Daily P&L", color="white", fontsize=14)

            # 軸の非表示（シンプルにするため）
            ax.spines["top"].set_visible(False)
            ax.spines["right"].set_visible(False)
            ax.spines["left"].set_visible(False)
            ax.get_yaxis().set_visible(False)
            ax.tick_params(axis="x", colors="white", labelsize=12)

            plt.tight_layout()

            output_path = os.path.join(self.output_dir, filename)
            plt.savefig(output_path, dpi=100, bbox_inches="tight", facecolor="#0E1117")
            plt.close()

            return output_path

        except Exception as e:
            logger.error(f"Failed to generate PnL chart: {e}")
            return None
