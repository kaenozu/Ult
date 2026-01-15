"""
日本語UI改善モジュール
Japanese UI Enhancement Module
自然な日本語表現と文化的に適したUI設計を提供
"""

import re
import streamlit as st
from typing import Dict, List, Optional
from datetime import datetime, timedelta


class JapaneseUIEnhancer:
    """日本語UIを改善するためのクラス"""

    # 日本の金融用語辞書
    FINANCIAL_TERMS = {
        "BUY": "買い",
        "SELL": "売り",
        "HOLD": "保有",
        "Position": "ポジション",
        "Portfolio": "ポートフォリオ",
        "Profit": "利益",
        "Loss": "損失",
        "Return": "リターン",
        "Risk": "リスク",
        "Asset": "資産",
        "Cash": "現金",
        "Price": "価格",
        "Volume": "出来高",
        "Market": "市場",
        "Stock": "株式",
        "Ticker": "銘柄コード",
        "Strategy": "戦略",
        "Signal": "シグナル",
        "Analysis": "分析",
        "Prediction": "予測",
        "Performance": "パフォーマンス",
        "Benchmark": "ベンチマーク",
        "Volatility": "ボラティリティ",
        "Dividend": "配当",
        "Yield": "利回り",
        "PE Ratio": "PER",
        "PB Ratio": "PBR",
        "Market Cap": "時価総額",
        "EPS": "EPS",
        "ROE": "ROE",
        "ROA": "ROA",
        "Trading": "売買",
        "Order": "注文",
        "Execution": "執行",
        "Cancel": "キャンセル",
        "Modify": "変更",
        "Confirm": "確認",
        "Submit": "送信",
        "Reset": "リセット",
        "Save": "保存",
        "Delete": "削除",
        "Edit": "編集",
        "View": "表示",
        "Search": "検索",
        "Filter": "フィルター",
        "Sort": "ソート",
        "Export": "エクスポート",
        "Import": "インポート",
        "Download": "ダウンロード",
        "Upload": "アップロード",
        "Refresh": "更新",
        "Loading": "読み込み中",
        "Complete": "完了",
        "Error": "エラー",
        "Warning": "警告",
        "Info": "情報",
        "Success": "成功",
    }

    # 自然な日本語表現への変換
    NATURAL_EXPRESSIONS = {
        "買います": "買い注文",
        "売ります": "売り注文",
        "保有します": "現状維持",
        "おすすめ": "推奨",
        "アラート": "注意喚起",
        "ニュース": "ニュース",
        "レポート": "レポート",
        "サマリー": "要約",
        "詳細": "詳細情報",
        "設定": "設定",
        "ヘルプ": "ヘルプ",
        "終了": "終了",
        "開始": "開始",
        "一時停止": "一時停止",
        "再開": "再開",
        "バックテスト": "バックテスト",
        "シミュレーション": "シミュレーション",
        "オプティマイズ": "最適化",
        "モニタリング": "監視",
        "アナリシス": "分析",
        "フォーキャスト": "予測",
    }

    @classmethod
    def translate_financial_term(cls, term: str) -> str:
        """金融用語を日本語に翻訳"""
        return cls.FINANCIAL_TERMS.get(term.upper(), term)

    @classmethod
    def naturalize_expression(cls, text: str) -> str:
        """表現を自然な日本語に変換"""
        for en, ja in cls.NATURAL_EXPRESSIONS.items():
            text = text.replace(en, ja)
        return text

    @classmethod
    def format_currency_japanese(cls, amount: float, show_sign: bool = False) -> str:
        """日本の通貨フォーマットで表示"""
        if amount >= 1_000_000_000:
            formatted = f"{amount / 1_000_000_000:.1f}億円"
        elif amount >= 10_000:
            formatted = f"{amount / 10_000:.1f}万円"
        else:
            formatted = f"¥{amount:,.0f}"

        if show_sign and amount > 0:
            formatted = f"+{formatted}"
        elif show_sign and amount < 0:
            formatted = f"-{formatted.replace('-', '')}"

        return formatted

    @classmethod
    def format_percentage_japanese(cls, value: float, decimals: int = 2) -> str:
        """日本のパーセンテージフォーマット"""
        return f"{value:+.{decimals}f}%"

    @classmethod
    def format_date_japanese(cls, date_obj: datetime) -> str:
        """日本の日付フォーマット"""
        return date_obj.strftime("%Y年%m月%d日")

    @classmethod
    def format_datetime_japanese(cls, datetime_obj: datetime) -> str:
        """日本の日時フォーマット"""
        return datetime_obj.strftime("%Y年%m月%d日 %H:%M")

    @classmethod
    def get_market_status_japanese(cls) -> Dict[str, str]:
        """日本の市場ステータス表現"""
        now = datetime.now()
        hour = now.hour

        # 東証の取引時間判定
        if 9 <= hour < 12:
            status = "午前立会"
            status_color = "success"
        elif 12 <= hour < 15:
            status = "午後立会"
            status_color = "success"
        elif 15 <= hour < 16:
            status = "大引け後"
            status_color = "warning"
        else:
            status = "取引時間外"
            status_color = "info"

        return {
            "status": status,
            "color": status_color,
            "description": f"現在は{status}です",
        }

    @classmethod
    def get_risk_level_japanese(cls, risk_score: float) -> Dict[str, str]:
        """日本のリスクレベル表現"""
        if risk_score < 30:
            return {
                "level": "低リスク",
                "color": "success",
                "description": "安定運用向けの低リスク水準",
                "emoji": "🟢",
            }
        elif risk_score < 60:
            return {
                "level": "中リスク",
                "color": "warning",
                "description": "バランス型の中リスク水準",
                "emoji": "🟡",
            }
        else:
            return {
                "level": "高リスク",
                "color": "danger",
                "description": "積極型の高リスク水準",
                "emoji": "🔴",
            }

    @classmethod
    def generate_japanese_message(cls, message_type: str, **kwargs) -> str:
        """状況に応じた日本語メッセージを生成"""

        templates = {
            "welcome": "AGStock AIトレーディングシステムへようこそ。{user_name}様の運用をサポートします。",
            "market_open": "本日の東証市場が開始しました。良い取引になりますように。",
            "market_close": "本日の取引を終了します。本日もお疲れ様でした。",
            "signal_buy": "{ticker}に買いシグナルが検出されました。{reason}",
            "signal_sell": "{ticker}に売りシグナルが検出されました。{reason}",
            "profit_achieved": "{ticker}で{profit}の利益を確定しました。",
            "loss_occurred": "{ticker}で{loss}の損失が発生しました。",
            "risk_warning": "リスクレベルが上昇しています。ポジションの見直しを検討してください。",
            "system_error": "システムエラーが発生しました。しばらくしてから再度お試しください。",
            "data_loading": "データを読み込み中です。少々お待ちください...",
            "analysis_complete": "分析が完了しました。結果をご確認ください。",
            "order_executed": "{ticker}の{action}注文が約定しました。",
            "insufficient_funds": "残高が不足しています。ご確認ください。",
            "position_limit": "ポジション制限に達しました。追加のポジションは制限されます。",
        }

        template = templates.get(message_type, "メッセージがありません。")

        # プレースホルダーを置換
        for key, value in kwargs.items():
            template = template.replace(f"{{{key}}}", str(value))

        return template


def render_japanese_ui_components():
    """日本語UIコンポーネントをレンダリング"""

    # ヘルプセクション（日本語）
    def render_japanese_help():
        with st.expander("📖 使い方ガイド", expanded=False):
            help_content = """
            ## AGStock AIトレーディングシステム ガイド
            
            ### 基本操作
            1. **ダッシュボード**: 市場概要とポートフォリオ状況を確認
            2. **トレーディング**: 買い売りの実行と管理
            3. **AI分析**: AIによる予測と分析結果
            4. **パフォーマンス**: 運用成績の詳細分析
            
            ### 用語集
            - **ポジション**: 現在保有している株式
            - **シグナル**: AIによる売買サイン
            - **バックテスト**: 過去データでの戦略テスト
            - **ボラティリティ**: 価格変動の激しさ
            
            ### 注意事項
            - 本システムはあくまで参考情報です
            - 投資判断はご自身の責任でお願いします
            - 市場の状況によっては予測が外れることがあります
            """
            st.markdown(help_content)

    def render_japanese_status_bar():
        """日本語ステータスバー"""
        market_status = JapaneseUIEnhancer.get_market_status_japanese()

        col1, col2, col3 = st.columns(3)

        with col1:
            st.markdown(f"**市場状況**: {market_status['status']}")

        with col2:
            st.markdown(f"**現在時刻**: {datetime.now().strftime('%H:%M:%S')}")

        with col3:
            st.markdown(f"**取引日**: {datetime.now().strftime('%Y年%m月%d日')}")

    def render_japanese_quick_actions():
        """日本語クイックアクションボタン"""
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            if st.button("🔄 最新データ", key="refresh_jp", help="データを最新状態に更新"):
                st.success("データを更新しました")

        with col2:
            if st.button("📊 レポート作成", key="report_jp", help="運用レポートを作成"):
                st.info("レポートを作成中です...")

        with col3:
            if st.button("⚙️ 設定", key="settings_jp", help="システム設定"):
                st.session_state.selected_tab = 4
                st.experimental_rerun()

        with col4:
            if st.button("❓ ヘルプ", key="help_jp", help="使い方を表示"):
                render_japanese_help()

    # モバイル対応の日本語UI
    def render_mobile_japanese_ui():
        """モバイル向け日本語UI"""

        # コンパクトなメトリクス表示
        col1, col2 = st.columns(2)

        with col1:
            st.metric("総資産", "¥2,500,000", "+2.3%")

        with col2:
            st.metric("本日損益", "+¥15,000", "+0.6%")

        # タブ形式のナビゲーション
        tab_names = ["概要", "取引", "AI", "設定"]
        tabs = st.tabs(tab_names)

        return tabs

    return {
        "help": render_japanese_help,
        "status_bar": render_japanese_status_bar,
        "quick_actions": render_japanese_quick_actions,
        "mobile_ui": render_mobile_japanese_ui,
    }


def enhance_japanese_text(text: str) -> str:
    """テキストを日本語UI用に最適化"""
    # 英数字の周りにスペースを追加
    text = re.sub(r"([a-zA-Z0-9]+)", r" \1 ", text)
    text = re.sub(r"\s+", " ", text).strip()

    # 金融用語の翻訳
    enhancer = JapaneseUIEnhancer()
    text = enhancer.naturalize_expression(text)

    return text


def validate_japanese_input(text: str, input_type: str = "general") -> tuple[bool, str]:
    """日本語入力のバリデーション"""

    if not text or not text.strip():
        return False, "入力が空です"

    if input_type == "ticker":
        # 銘柄コードの形式チェック
        if not re.match(r"^\d{4}\.?[T]?$", text.upper()):
            return False, "銘柄コードの形式が正しくありません（例：7203または7203.T）"

    elif input_type == "amount":
        # 金額の形式チェック
        if not re.match(r"^\d+$", text.replace(",", "")):
            return False, "金額の形式が正しくありません"

    elif input_type == "name":
        # 名前の長さチェック
        if len(text) > 50:
            return False, "名前が長すぎます"

    return True, ""


# 日本の祝日カレンダー
def is_japanese_holiday(date: datetime) -> bool:
    """日本の祝日かどうかを判定"""
    # 簡易的な祝日判定（実際にはライブラリを使用することが推奨）
    holidays = [
        (1, 1),  # 元日
        (1, 2),  # 元日振替休日
        (12, 31),  # 大晦日
    ]

    return (date.month, date.day) in holidays


def get_japanese_trading_calendar() -> Dict[str, bool]:
    """日本の取引カレンダー情報を取得"""
    today = datetime.now()

    # 土日チェック
    is_weekend = today.weekday() >= 5

    # 祝日チェック
    is_holiday = is_japanese_holiday(today)

    # 取引時間チェック
    current_hour = today.hour
    is_trading_hours = (9 <= current_hour < 12) or (12 <= current_hour < 15)

    return {
        "is_trading_day": not (is_weekend or is_holiday),
        "is_trading_hours": is_trading_hours,
        "is_weekend": is_weekend,
        "is_holiday": is_holiday,
        "market_status": JapaneseUIEnhancer.get_market_status_japanese(),
    }
