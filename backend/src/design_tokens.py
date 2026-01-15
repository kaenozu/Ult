"""
Design Tokens - デザインシステムの定数定義
アプリケーション全体で使用する色、サイズ、スペーシングなどを一元管理
"""


# カラーパレット
class Colors:
    # Primary Colors
    PRIMARY_BLUE = "#2563eb"
    PRIMARY_CYAN = "#00d4ff"
    PRIMARY_GREEN = "#00ff9d"

    # Semantic Colors
    SUCCESS = "#10b981"
    WARNING = "#f59e0b"
    DANGER = "#ef4444"
    INFO = "#3b82f6"
    NEUTRAL = "#6b7280"

    # Risk Levels
    RISK_LOW = "#10b981"
    RISK_MEDIUM = "#f59e0b"
    RISK_HIGH = "#ef4444"

    # Backgrounds
    BG_PRIMARY = "#0e1117"
    BG_SECONDARY = "#1f2937"
    BG_CARD = "rgba(31, 41, 55, 0.6)"
    BG_HOVER = "rgba(255, 255, 255, 0.05)"

    # Text
    TEXT_PRIMARY = "#ffffff"
    TEXT_SECONDARY = "#e0e0e0"
    TEXT_TERTIARY = "#9ca3af"

    # Borders
    BORDER_DEFAULT = "#374151"
    BORDER_FOCUS = "rgba(0, 212, 255, 0.3)"


# タイポグラフィ
class Typography:
    FONT_FAMILY_PRIMARY = "Inter, sans-serif"
    FONT_FAMILY_MONO = "JetBrains Mono, monospace"

    # Font Sizes
    SIZE_TITLE = "2.5rem"  # h1
    SIZE_HEADING = "2rem"  # h2
    SIZE_SUBHEADING = "1.5rem"  # h3
    SIZE_BODY = "1rem"
    SIZE_CAPTION = "0.875rem"

    # Font Weights
    WEIGHT_REGULAR = 400
    WEIGHT_SEMIBOLD = 600
    WEIGHT_BOLD = 700


# スペーシング
class Spacing:
    XS = "0.25rem"  # 4px
    SM = "0.5rem"  # 8px
    MD = "1rem"  # 16px
    LG = "1.5rem"  # 24px
    XL = "2rem"  # 32px
    XXL = "3rem"  # 48px


# ブレークポイント（レスポンシブデザイン用）
class Breakpoints:
    MOBILE = 768  # px
    TABLET = 1024  # px
    DESKTOP = 1280  # px


# その他の定数
class Constants:
    BORDER_RADIUS = "8px"
    BORDER_RADIUS_LARGE = "12px"
    TRANSITION_SPEED = "0.3s"
    BOX_SHADOW = "0 4px 6px rgba(0, 0, 0, 0.1)"
    BOX_SHADOW_HOVER = "0 10px 15px rgba(0, 0, 0, 0.2)"


# リスクレベル表示用の設定
RISK_LEVELS = {
    "low": {
        "label_ja": "低",
        "label_en": "Low",
        "color": Colors.RISK_LOW,
        "emoji": "🟢",
        "threshold": 0.1,  # Max Drawdown < 10%
    },
    "medium": {
        "label_ja": "中",
        "label_en": "Medium",
        "color": Colors.RISK_MEDIUM,
        "emoji": "🟡",
        "threshold": 0.2,  # Max Drawdown 10-20%
    },
    "high": {
        "label_ja": "高",
        "label_en": "High",
        "color": Colors.RISK_HIGH,
        "emoji": "🔴",
        "threshold": 1.0,  # Max Drawdown > 20%
    },
}

# アクション（売買シグナル）表示用の設定
ACTION_TYPES = {
    "BUY": {"label_ja": "買い", "color": Colors.SUCCESS, "emoji": "📈", "icon": "🟢"},
    "SELL": {"label_ja": "売り", "color": Colors.DANGER, "emoji": "📉", "icon": "🔴"},
    "HOLD": {"label_ja": "様子見", "color": Colors.NEUTRAL, "emoji": "⏸️", "icon": "⚪"},
}

# センチメントラベル設定
SENTIMENT_LABELS = {
    "Positive": {
        "label_ja": "ポジティブ",
        "color": Colors.SUCCESS,
        "emoji": "🟢",
        "threshold": 0.15,
    },
    "Neutral": {
        "label_ja": "中立",
        "color": Colors.NEUTRAL,
        "emoji": "🟡",
        "threshold": -0.15,
    },
    "Negative": {
        "label_ja": "ネガティブ",
        "color": Colors.DANGER,
        "emoji": "🔴",
        "threshold": -1.0,
    },
}
