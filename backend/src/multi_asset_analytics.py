"""
複数市場および多資産クラス対応モジュール

- クロスマーケット特徴量
- グローバル市場スケジュール対応
- 暗号資産と伝統的資産の統合
"""

import logging
import warnings
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import pytz
import yfinance as yf

from .base_predictor import BasePredictor

warnings.filterwarnings("ignore")

logger = logging.getLogger(__name__)


class MarketSchedule:
    """グローバル市場スケジュール"""

    MARKET_HOURS = {
        # 日本 (東京)
        "JP": {"open": "09:00", "close": "15:00", "timezone": "Asia/Tokyo"},
        # アメリカ (ニューヨーク)
        "US": {"open": "09:30", "close": "16:00", "timezone": "America/New_York"},
        # ヨーロ (ロンドン)
        "EU": {"open": "08:00", "close": "16:30", "timezone": "Europe/London"},
        # 香港
        "HK": {"open": "09:30", "close": "16:00", "timezone": "Asia/Hong_Kong"},
        # シンガポール
        "SG": {"open": "09:00", "close": "17:00", "timezone": "Asia/Singapore"},
    }

    @staticmethod
    def is_market_open(market_code: str, dt: Optional[datetime] = None) -> bool:
        """指定した市場が現在営業中かどうかを確認"""
        if dt is None:
            dt = datetime.now()

        if market_code not in MarketSchedule.MARKET_HOURS:
            return False

        market_info = MarketSchedule.MARKET_HOURS[market_code]
        tz = pytz.timezone(market_info["timezone"])

        # 時刻を対象タイムゾーンに変換
        dt_tz = dt.astimezone(tz)

        # 曜日確認（営業日かどうか）
        if dt_tz.weekday() > 4:  # 土日
            return False

        # 時間確認
        open_time = datetime.strptime(market_info["open"], "%H:%M").time()
        close_time = datetime.strptime(market_info["close"], "%H:%M").time()

        return open_time <= dt_tz.time() <= close_time

    @staticmethod
    def get_next_open_time(market_code: str, dt: Optional[datetime] = None) -> datetime:
        """次の市場オープン時刻を取得"""
        if dt is None:
            dt = datetime.now()

        market_info = MarketSchedule.MARKET_HOURS[market_code]
        tz = pytz.timezone(market_info["timezone"])
        dt_tz = dt.astimezone(tz)

        open_time = datetime.strptime(market_info["open"], "%H:%M").time()
        next_open = dt_tz.replace(hour=open_time.hour, minute=open_time.minute, second=0, microsecond=0)

        if next_open <= dt_tz:  # 既に本日の営業時間を過ぎている場合
            next_open += timedelta(days=1)
            # 休日を考慮（月曜日が営業日になるように調整）
            while next_open.weekday() > 4:
                next_open += timedelta(days=1)

        return next_open.astimezone(pytz.UTC)  # UTCに戻す


class MultiAssetDataLoader:
    """多資産データローダー"""

    def __init__(self):
        self.cache = {}
        self.cache_expiry = timedelta(hours=1)

    def load_stock_data(self, tickers: List[str], period: str = "1y") -> Dict[str, pd.DataFrame]:
        """株式データの取得"""
        return self._load_yfinance_data(tickers, period)

    def load_crypto_data(self, tickers: List[str], period: str = "1y") -> Dict[str, pd.DataFrame]:
        """暗号資産データの取得"""
        # yfinanceを使用して暗号資産データを取得
        crypto_tickers = [f"{ticker}-USD" for ticker in tickers if not ticker.endswith("-USD")]
        return self._load_yfinance_data(crypto_tickers, period)

    def load_forex_data(self, pairs: List[str], period: str = "1y") -> Dict[str, pd.DataFrame]:
        """為替データの取得"""
        # yfinanceを使用して為替データを取得
        forex_tickers = [f"{pair}=X" for pair in pairs if not pair.endswith("=X")]
        return self._load_yfinance_data(forex_tickers, period)

    def load_bond_data(self, tickers: List[str], period: str = "1y") -> Dict[str, pd.DataFrame]:
        """債券データの取得"""
        return self._load_yfinance_data(tickers, period)

    def _load_yfinance_data(self, tickers: List[str], period: str) -> Dict[str, pd.DataFrame]:
        """yfinanceからデータを一括取得"""
        if not tickers:
            return {}

        # キャッシュ確認
        cache_key = f"{'_'.join(sorted(tickers))}_{period}"
        if cache_key in self.cache:
            cached_data, timestamp = self.cache[cache_key]
            if datetime.now() - timestamp < self.cache_expiry:
                return cached_data

        try:
            # 一括ダウンロード
            data = yf.download(
                tickers,
                period=period,
                interval="1d",
                group_by="ticker",
                auto_adjust=True,
                threads=True,
            )

            result = {}
            if len(tickers) == 1:
                # 単一ティッカーの場合
                ticker = tickers[0]
                if ticker in data.columns:
                    df = data[ticker].dropna()
                    result[ticker] = df
                else:
                    result[ticker] = data.dropna()
            else:
                # 複数ティッカーの場合
                for ticker in tickers:
                    if ticker in data.columns:
                        df = data[ticker].dropna()
                        result[ticker] = df
                    elif isinstance(data.columns, pd.MultiIndex):
                        # MultiIndexの場合はticker別に抽出
                        ticker_data = data.xs(ticker, axis=1, level=1) if ticker in data.columns.levels[1] else data
                        result[ticker] = ticker_data.dropna()

            # キャッシュに保存
            self.cache[cache_key] = (result, datetime.now())
            return result

        except Exception as e:
            logger.error(f"Error loading data from yfinance: {e}")
            return {}

    def get_market_correlation_matrix(self, assets_data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """市場間の相関行列を計算"""
        returns_data = {}
        for asset, df in assets_data.items():
            if "Close" in df.columns:
                returns_data[asset] = df["Close"].pct_change().dropna()

        if not returns_data:
            return pd.DataFrame()

        # 全て同じ期間のデータにリサンプル
        all_dates = set()
        for returns in returns_data.values():
            all_dates.update(returns.index)

        aligned_returns = {}
        for asset, returns in returns_data.items():
            aligned_returns[asset] = returns.reindex(all_dates).fillna(0)

        # 相関行列を計算
        returns_df = pd.DataFrame(aligned_returns)
        correlation_matrix = returns_df.corr()

        return correlation_matrix


class CrossMarketFeatureEngineer:
    """クロスマーケット特徴量エンジニア"""

    def __init__(self):
        self.market_schedule = MarketSchedule()

    def add_cross_market_features(self, target_df: pd.DataFrame, market_data: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """クロスマーケット特徴量を追加"""
        df_out = target_df.copy()

        if not market_data:
            return df_out

        # 各市場のリターン特徴量
        for market_name, market_df in market_data.items():
            if "Close" not in market_df.columns or "Close" not in df_out.columns:
                continue

            # 市場リターン
            market_returns = market_df["Close"].pct_change()
            df_out[f"{market_name}_Return"] = market_returns.reindex(df_out.index, method="ffill")

            # 市場ボラティリティ
            df_out[f"{market_name}_Volatility"] = market_returns.rolling(20).std().reindex(df_out.index, method="ffill")

            # クロスマーケット相関（過去30日間）
            target_returns = df_out["Close"].pct_change()
            rolling_corr = target_returns.rolling(30).corr(market_returns)
            df_out[f"{market_name}_Correlation"] = rolling_corr.reindex(df_out.index, method="ffill")

        # 海外市場の前日終値からの変化（日本市場におけるアメリカ市場の影響）
        us_markets = [m for m in market_data.keys() if any(c in m for c in ["US", "SPY", "DIA", "QQQ"])]
        if us_markets and not df_out.empty:
            latest_us_data = market_data.get(us_markets[0])
            if latest_us_data is not None and not latest_us_data.empty:
                # 前日比リターンを計算
                us_return_prev = latest_us_data["Close"].pct_change().shift(1)
                df_out["US_Market_Effect"] = us_return_prev.reindex(df_out.index, method="ffill")

        return df_out

    def add_global_sentiment_features(self, df: pd.DataFrame, vix_data: Optional[pd.DataFrame] = None) -> pd.DataFrame:
        """グローバルセンチメント特徴量を追加"""
        df_out = df.copy()

        # VIX（恐怖指数）があれば統合
        if vix_data is not None and "Close" in vix_data.columns:
            vix_returns = vix_data["Close"].pct_change()
            df_out["VIX_Level"] = vix_data["Close"].reindex(df_out.index, method="ffill")
            df_out["VIX_Change"] = vix_returns.reindex(df_out.index, method="ffill")

        # 金利特徴量（米国10年物国債利回りなど）
        # ここでは仮のデータとして追加（実際には適切なデータソースが必要）

        # リスクオン/リスクオフ指標
        # 例: 株価指数のリターンと債券価格のリターンの差分
        if "Close" in df_out.columns and vix_data is not None and "Close" in vix_data.columns:
            stock_return = df_out["Close"].pct_change()
            vix_change = vix_data["Close"].pct_change()
            df_out["Risk_Appetite"] = stock_return - vix_change.reindex(stock_return.index, method="ffill")

        return df_out


class MultiAssetPredictor(BasePredictor):
    """多資産対応予測器"""

    def __init__(self):
        self.data_loader = MultiAssetDataLoader()
        self.feature_engineer = CrossMarketFeatureEngineer()
        self.models = {}
        self.models = {}
        self.asset_weights = {}

    def prepare_model(self, X, y):
        pass

    def fit(self, X, y):
        pass

    def predict(self, X):
        # 簡易実装: 変化なし(0)または単純なトレンド
        return np.zeros(len(X))

    def prepare_multi_asset_features(
        self,
        target_ticker: str,
        target_data: pd.DataFrame,
        related_assets: Dict[str, str] = None,  # {ticker: asset_type}
    ) -> pd.DataFrame:
        """多資産特徴量の準備"""
        if related_assets is None:
            related_assets = {}

        # 関連資産のデータを取得
        related_data = {}
        for ticker, asset_type in related_assets.items():
            if asset_type == "stock":
                data = self.data_loader.load_stock_data([ticker])
            elif asset_type == "crypto":
                data = self.data_loader.load_crypto_data([ticker])
            elif asset_type == "forex":
                data = self.data_loader.load_forex_data([ticker])
            elif asset_type == "bond":
                data = self.data_loader.load_bond_data([ticker])
            else:
                continue

            if ticker in data:
                related_data[ticker] = data[ticker]

        # クロスマーケット特徴量を追加
        enhanced_df = self.feature_engineer.add_cross_market_features(target_data, related_data)

        # グローバルセンチメント特徴量を追加
        # VIXデータを取得
        vix_data = self.data_loader.load_stock_data(["^VIX"])
        if "^VIX" in vix_data:
            enhanced_df = self.feature_engineer.add_global_sentiment_features(enhanced_df, vix_data["^VIX"])

        return enhanced_df

    def get_cross_market_signals(self, target_ticker: str, lookback_days: int = 30) -> Dict[str, float]:
        """クロスマーケットシグナルを取得"""
        # 一般的な関連銘柄
        related_tickers = {
            "US": ["SPY", "QQQ", "IWM"],  # 米国株
            "EU": ["IEV", "EZU"],  # ヨーロ株
            "Bond": ["TLT", "IEF"],  # 米国債
            "Commodity": ["GSG", "DBC"],  # コモディティ
            "Currency": ["UUP", "FXE"],  # 通貨
        }

        signals = {}

        for category, tickers in related_tickers.items():
            data = self.data_loader.load_stock_data(tickers)
            for ticker, df in data.items():
                if not df.empty and "Close" in df.columns:
                    # 直近のリターンを計算
                    recent_return = df["Close"].pct_change(lookback_days).iloc[-1] if len(df) > lookback_days else 0
                    signals[f"{ticker}_return_{lookback_days}d"] = recent_return

        return signals

    def predict_multi_asset(
        self,
        target_ticker: str,
        target_data: pd.DataFrame,
        prediction_days: int = 5,
        related_assets: Dict[str, str] = None,
    ) -> Dict:
        """多資産対応予測"""
        try:
            # 多資産特徴量の準備
            enhanced_data = self.prepare_multi_asset_features(target_ticker, target_data, related_assets)

            # 価格変動率の計算
            returns = enhanced_data["Close"].pct_change()

            # 予測結果（単純な平均回帰ベース）
            current_price = enhanced_data["Close"].iloc[-1]
            recent_returns = returns.tail(20).dropna()

            if len(recent_returns) > 0:
                avg_return = recent_returns.mean()
                predicted_changes = []
                current = current_price

                for i in range(prediction_days):
                    # 市場相関、ボラティリティなどを考慮した簡易予測
                    volatility_factor = (
                        max(
                            0.5,
                            min(
                                2.0,
                                enhanced_data["Close"].rolling(20).std().iloc[-1]
                                / enhanced_data["Close"].iloc[-1]
                                * 1000
                                + 1,
                            ),
                        )
                        if len(enhanced_data) >= 20
                        else 1.0
                    )
                    predicted_return = avg_return * (0.8**i) * volatility_factor  # 時間とともに影響を弱める
                    current = current * (1 + predicted_return)
                    predicted_changes.append(current)
            else:
                # 取得できなかった場合は現在価格を維持
                predicted_changes = [current_price] * prediction_days

            # トレンド判定
            trend = "FLAT"
            if predicted_changes[-1] > current_price * 1.02:
                trend = "UP"
            elif predicted_changes[-1] < current_price * 0.98:
                trend = "DOWN"

            return {
                "current_price": current_price,
                "predictions": predicted_changes,
                "trend": trend,
                "change_pct": (predicted_changes[-1] - current_price) / current_price * 100,
                "cross_market_signals": self.get_cross_market_signals(target_ticker),
                "features_used": [
                    col for col in enhanced_data.columns if col.startswith(("SPY_", "US_", "VIX_", "Risk_"))
                ],
            }

        except Exception as e:
            logger.error(f"Multi-asset prediction error: {e}")
            return {"error": str(e)}


class GlobalMarketAnalyzer:
    """グローバル市場アナライザー"""

    def __init__(self):
        self.data_loader = MultiAssetDataLoader()
        self.schedule = MarketSchedule()

    def get_global_market_status(self) -> Dict[str, Dict[str, any]]:
        """グローバル市場の現在状況を取得"""
        now = datetime.now()
        market_status = {}

        for market_code, info in MarketSchedule.MARKET_HOURS.items():
            tz = pytz.timezone(info["timezone"])
            local_time = now.astimezone(tz)

            market_status[market_code] = {
                "is_open": self.schedule.is_market_open(market_code, now),
                "local_time": local_time.strftime("%H:%M"),
                "timezone": info["timezone"],
                "next_open": self.schedule.get_next_open_time(market_code, now).strftime("%Y-%m-%d %H:%M:%S"),
            }

        return market_status

    def analyze_global_interconnection(self, target_ticker: str, lookback_days: int = 60) -> Dict[str, any]:
        """世界市場の相互接続性を分析"""
        # 主要市場の代表銘柄
        major_indices = {
            "US_Stock": "SPY",
            "EU_Stock": "IEV",
            "JP_Stock": "EWJ",
            "HK_Stock": "EWH",
            "US_Bond": "TLT",
            "Gold": "GLD",
            "Oil": "USO",
            "USD": "UUP",
        }

        all_data = {}
        correlations = {}

        for name, ticker in major_indices.items():
            data = self.data_loader.load_stock_data([ticker], period=f"{lookback_days}d")
            if ticker in data and not data[ticker].empty:
                all_data[name] = data[ticker]
                correlations[name] = data[ticker]["Close"].pct_change()

        # ターゲット銘柄のデータも取得
        target_data = self.data_loader.load_stock_data([target_ticker], period=f"{lookback_days}d")
        if target_ticker in target_data and not target_data[target_ticker].empty:
            target_returns = target_data[target_ticker]["Close"].pct_change()

            # 相関を計算
            for name, returns in correlations.items():
                if len(returns) == len(target_returns):
                    corr = returns.corr(target_returns)
                    correlations[name] = corr
                else:
                    correlations[name] = 0  # 期間が合わない場合は0

        return {
            "correlation_analysis": correlations,
            "data_availability": {name: not df.empty for name, df in all_data.items()},
            "lookback_period": lookback_days,
        }


if __name__ == "__main__":
    # テスト用コード
    logging.basicConfig(level=logging.INFO)

    # マルチアセットローダーのテスト
    loader = MultiAssetDataLoader()

    # 株価データの取得
    stock_data = loader.load_stock_data(["7203.T", "AAPL"], period="1mo")
    print(f"Stock data loaded: {list(stock_data.keys())}")

    # 暗号資産データの取得
    crypto_data = loader.load_crypto_data(["BTC", "ETH"], period="1mo")
    print(f"Crypto data loaded: {list(crypto_data.keys())}")

    # 為替データの取得
    forex_data = loader.load_forex_data(["USDJPY", "EURJPY"], period="1mo")
    print(f"Forex data loaded: {list(forex_data.keys())}")

    # クロスマーケットアナライザーのテスト
    analyzer = GlobalMarketAnalyzer()
    status = analyzer.get_global_market_status()
    print(f"Global market status: {status}")

    # マルチアセット予測器のテスト
    predictor = MultiAssetPredictor()
    if "7203.T" in stock_data:
        related_assets = {
            "SPY": "stock",  # 米国株
            "TLT": "bond",  # 米国債
            "GLD": "stock",  # 金（実際には商品だが、ここでは株として扱う）
        }

        result = predictor.predict_multi_asset("7203.T", stock_data["7203.T"], related_assets=related_assets)

        print(f"Multi-asset prediction result: {result}")

    print("Multi-market and multi-asset components test completed.")
