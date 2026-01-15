import datetime
from typing import Dict, List

import pandas as pd

from src.constants import NIKKEI_225_TICKERS, SP500_TICKERS  # 地域判定のため
from src.data_loader import fetch_fundamental_data, fetch_stock_data, get_latest_price
from src.ensemble_predictor import EnhancedEnsemblePredictor  # 中期予測フィルター
from src.sentiment import SentimentAnalyzer
from src.strategies import CombinedStrategy, DividendStrategy, LightGBMStrategy, MLStrategy


class MarketScanner:
    """
    市場をスキャンして新規の取引シグナルを検出する機能を提供します。
    """

    def __init__(
        self,
        config: dict,
        paper_trader,
        logger,
        advanced_risk,
        asset_selector,
        position_manager,
        kelly_criterion,
        risk_manager,
    ):
        self.config = config
        self.pt = paper_trader
        self.logger = logger
        self.advanced_risk = advanced_risk
        self.asset_selector = asset_selector
        self.position_manager = position_manager  # _fetch_data_with_retry を使うため
        self.kelly_criterion = kelly_criterion
        self.risk_manager = risk_manager  # regime_multiplier の取得のため

        self.asset_config = self.config.get(
            "assets", {"japan_stocks": True, "us_stocks": True, "europe_stocks": True, "crypto": False, "fx": False}
        )
        self.allow_small_mid_cap = True  # AssetSelectorから引き継ぎ

    def scan_market(self) -> List[Dict]:
        """市場をスキャンして新規シグナルを検出（グローバル分散対応）"""
        self.logger.info("市場スキャン開始...")

        # 🚨 市場急落チェック
        allow_buy_market, market_reason = self.advanced_risk.check_market_crash(self.logger)
        if not allow_buy_market:
            self.logger.warning(f"⚠️ 市場急落のため新規BUY停止: {market_reason}")

        # センチメント分析
        try:
            sa = SentimentAnalyzer()
            sentiment = sa.get_market_sentiment()
            self.logger.info(f"市場センチメント: {sentiment['label']} ({sentiment['score']:.2f})")

            # ネガティブセンチメント時はBUYを抑制
            allow_buy = sentiment["score"] >= -0.2
        except Exception as e:
            self.logger.warning(f"センチメント分析エラー: {e}")
            allow_buy = True

        # 対象銘柄（グローバル分散）
        tickers = self.asset_selector.get_target_tickers()
        self.logger.info(f"対象銘柄数: {len(tickers)}")

        # データ取得（リトライ付き）
        data_map = self.position_manager._fetch_data_with_retry(tickers)

        # データの鮮度を確認・ログ出力
        if data_map:
            sample_ticker = list(data_map.keys())[0]
            sample_df = data_map[sample_ticker]
            if not sample_df.empty:
                data_date = (
                    sample_df.index[-1].strftime("%Y-%m-%d %H:%M")
                    if hasattr(sample_df.index[-1], "strftime")
                    else str(sample_df.index[-1])
                )
                self.logger.info(f"📅 データ基準日時: {data_date} (最新の市場データ)")
                self.logger.info(f"⏰ 判断実行日時: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # 戦略初期化
        strategies = [
            ("LightGBM", LightGBMStrategy(lookback_days=365, threshold=0.005)),
            ("ML Random Forest", MLStrategy()),
            ("Combined", CombinedStrategy()),
            ("High Dividend", DividendStrategy()),  # 修正済みの安全な高配当戦略を追加
        ]

        positions = self.pt.get_positions()
        held_tickers = set(positions["ticker"]) if not positions.empty else set()
        signals = []
        candidate_buys = []

        for ticker in tickers:
            df = data_map.get(ticker)
            if df is None or df.empty:
                continue

            # 既にポジションを持っているかチェック
            is_held = ticker in held_tickers

            # 各戦略でシグナル生成
            for strategy_name, strategy in strategies:
                try:
                    sig_series = strategy.generate_signals(df)

                    if sig_series.empty:
                        continue

                    last_signal = sig_series.iloc[-1]

                    # BUYシグナル
                    if last_signal == 1 and not is_held and allow_buy:
                        # 候補として追加（後で一括最適化するため）
                        candidate_buys.append({
                            "ticker": ticker,
                            "price": get_latest_price(df),
                            "strategy": strategy_name,
                            "df": df # 後でリターン計算に使用
                        })
                        break # 1銘柄につき1戦略の候補

                    # SELLシグナル（保有中の場合）
                    elif last_signal == -1 and is_held:
                        latest_price = get_latest_price(df)

                        signals.append(
                            {
                                "ticker": ticker,
                                "action": "SELL",
                                "confidence": 0.85,
                                "price": latest_price,
                                "strategy": strategy_name,
                                "reason": f"{strategy_name}による売りシグナル",
                            }
                        )
                        break

                except Exception as e:
                    self.logger.warning(f"シグナル生成エラー ({ticker}, {strategy_name}): {e}")

        # --- 量子ハイブリッド最適化によるBUY銘柄の選別 ---
        if candidate_buys:
            self.logger.info(f"量子最適化開始: 候補銘柄数 {len(candidate_buys)}")
            
            try:
                from src.portfolio_optimizer import PortfolioOptimizer
                optimizer = PortfolioOptimizer()
                
                # 候補銘柄のリターンデータを準備
                returns_dict = {}
                for cand in candidate_buys:
                    returns_dict[cand["ticker"]] = cand["df"]["Close"].pct_change().dropna()
                
                returns_df = pd.DataFrame(returns_dict).dropna()
                
                if not returns_df.empty:
                    # 量子最適化実行 (リスク回避度を少し高めに設定)
                    opt_res = optimizer.quantum_hybrid_optimization(
                        returns_df, 
                        risk_aversion=0.7, 
                        target_assets=min(5, len(candidate_buys)) # 最大5銘柄に絞り込む
                    )
                    
                    weights = opt_res["weights"]
                    selected_tickers = weights[weights > 0.05].index.tolist()
                    
                    self.logger.info(f"量子最適化完了: {len(selected_tickers)} 銘柄を選択")
                    
                    for ticker in selected_tickers:
                        cand = next(c for c in candidate_buys if c["ticker"] == ticker)
                        weight = weights[ticker]
                        
                        # Phase 30-3: Kelly Criterion + Weight
                        balance = self.pt.get_current_balance()
                        equity = balance["total_equity"]
                        cash = balance["cash"]
                        
                        # Kellyベースの基本サイズに量子ウェイトを乗算
                        base_kelly = 0.1 # デフォルト10%
                        final_size_pct = base_kelly * (weight / weights.max())
                        
                        # キャッシュ状況とリスク設定に応じた最終調整
                        target_amount = equity * final_size_pct
                        target_amount = min(target_amount, cash * 0.9)
                        
                        latest_price = cand["price"]
                        is_us_stock = "." not in ticker
                        
                        if is_us_stock:
                            quantity = int(target_amount / latest_price)
                            if quantity < 1 and cash >= latest_price: quantity = 1
                        else:
                            quantity = int(target_amount / latest_price / 100) * 100
                            
                        if quantity > 0:
                            signals.append({
                                "ticker": ticker,
                                "action": "BUY",
                                "confidence": float(weight),
                                "price": latest_price,
                                "quantity": quantity,
                                "strategy": cand["strategy"],
                                "source": "local_quantum", # ソースを明示
                                "reason": f"量子ハイブリッド最適化により選出 (Weight: {weight:.2f})",
                            })
                else:
                    self.logger.warning("最適化用のリターンデータが不足しています。")
            except Exception as e:
                self.logger.error(f"量子最適化プロセス失敗: {e}")
                # フォールバック略
        
        # --- Phase 67: DAO Consensus (分散型合意形成) ---
        if signals:
            try:
                from src.trading.dao_client import DAOClient
                from src.trading.consensus_engine import ConsensusEngine
                
                dao_client = DAOClient()
                consensus_engine = ConsensusEngine(threshold=0.8) # 合意閾値を設定
                
                # ピアノードからシグナルを取得
                peer_signals = dao_client.fetch_peer_signals([s["ticker"] for s in signals])
                
                # ローカルシグナルとピアシグナルを統合
                all_signals = signals + peer_signals
                
                # コンセンサス形成
                self.logger.info("🤝 DAOコンセンサス形成プロセス実行中...")
                consensus_signals = consensus_engine.aggregate_signals(all_signals)
                
                if len(consensus_signals) < len(signals):
                    self.logger.info(f"🛡️ DAOコンセンサスにより {len(signals) - len(consensus_signals)} 件のシグナルがフィルタリングされました。")
                
                signals = consensus_signals
                
                # 最後にネットワークへ共有
                dao_client.share_insights(signals)
                
            except Exception as e:
                self.logger.error(f"DAOコンセンサスプロセス失敗: {e}")
                # 失敗時はローカルシグナルを維持

        self.logger.info(f"最終確定シグナル数: {len(signals)}")
        return signals
