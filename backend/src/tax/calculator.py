"""
税金計算モジュール

日本の株式譲渡益税・配当税の計算。
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Optional

import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class TaxConfig:
    """税率設定"""
    # 譲渡益税（申告分離課税）
    capital_gains_tax_rate: float = 0.20315  # 所得税15.315% + 住民税5%
    # 配当税（申告分離課税）
    dividend_tax_rate: float = 0.20315
    # 損益通算可能期間（年）
    loss_carryforward_years: int = 3
    # NISA非課税枠
    nisa_annual_limit: int = 3600000  # 新NISA（成長投資枠）


@dataclass
class TaxSummary:
    """税金サマリー"""
    year: int
    total_gains: float = 0.0
    total_losses: float = 0.0
    net_gains: float = 0.0
    total_dividends: float = 0.0
    capital_gains_tax: float = 0.0
    dividend_tax: float = 0.0
    total_tax: float = 0.0
    loss_carryforward: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "年度": self.year,
            "譲渡益合計": self.total_gains,
            "譲渡損合計": self.total_losses,
            "純譲渡損益": self.net_gains,
            "配当合計": self.total_dividends,
            "譲渡益税": self.capital_gains_tax,
            "配当税": self.dividend_tax,
            "合計税額": self.total_tax,
            "繰越損失": self.loss_carryforward,
        }


class TaxCalculator:
    """税金計算クラス"""
    
    def __init__(self, config: Optional[TaxConfig] = None):
        self.config = config or TaxConfig()
        self._loss_carryforward: Dict[int, float] = {}
    
    def calculate_trade_tax(self, trades: List[Dict]) -> TaxSummary:
        """取引から税金を計算"""
        if not trades:
            return TaxSummary(year=datetime.now().year)
        
        df = pd.DataFrame(trades)
        
        # 年度を抽出
        if "exit_date" in df.columns:
            df["exit_date"] = pd.to_datetime(df["exit_date"])
            df["year"] = df["exit_date"].dt.year
        else:
            df["year"] = datetime.now().year
        
        # 損益計算
        if "return" in df.columns and "entry_price" in df.columns:
            df["pnl"] = df["return"] * df["entry_price"] * df.get("quantity", 1)
        elif "pnl" not in df.columns:
            df["pnl"] = 0
        
        # 年度ごとの集計
        current_year = datetime.now().year
        year_data = df[df["year"] == current_year]
        
        gains = year_data[year_data["pnl"] > 0]["pnl"].sum()
        losses = abs(year_data[year_data["pnl"] < 0]["pnl"].sum())
        
        # 繰越損失の適用
        carryforward = sum(
            self._loss_carryforward.get(y, 0)
            for y in range(current_year - self.config.loss_carryforward_years, current_year)
        )
        
        net_gains = max(0, gains - losses - carryforward)
        capital_gains_tax = net_gains * self.config.capital_gains_tax_rate
        
        # 今年の損失を繰越
        if gains < losses:
            self._loss_carryforward[current_year] = losses - gains
        
        return TaxSummary(
            year=current_year,
            total_gains=gains,
            total_losses=losses,
            net_gains=net_gains,
            capital_gains_tax=capital_gains_tax,
            total_tax=capital_gains_tax,
            loss_carryforward=self._loss_carryforward.get(current_year, 0),
        )
    
    def calculate_dividend_tax(self, dividends: List[Dict]) -> float:
        """配当税を計算"""
        if not dividends:
            return 0.0
        
        total_dividends = sum(d.get("amount", 0) for d in dividends)
        return total_dividends * self.config.dividend_tax_rate
    
    def estimate_nisa_savings(self, trades: List[Dict]) -> float:
        """NISA利用時の節税額を推定"""
        if not trades:
            return 0.0
        
        summary = self.calculate_trade_tax(trades)
        # NISAなら税金がかからない
        return summary.total_tax
    
    def get_quarterly_summary(self, trades: List[Dict]) -> pd.DataFrame:
        """四半期ごとのサマリー"""
        if not trades:
            return pd.DataFrame()
        
        df = pd.DataFrame(trades)
        if "exit_date" not in df.columns:
            return pd.DataFrame()
        
        df["exit_date"] = pd.to_datetime(df["exit_date"])
        df["quarter"] = df["exit_date"].dt.to_period("Q")
        
        if "pnl" not in df.columns:
            if "return" in df.columns:
                df["pnl"] = df["return"] * df.get("entry_price", 1) * df.get("quantity", 1)
            else:
                df["pnl"] = 0
        
        quarterly = df.groupby("quarter").agg({
            "pnl": ["sum", "count"],
        })
        quarterly.columns = ["損益合計", "取引回数"]
        quarterly["推定税額"] = quarterly["損益合計"].apply(
            lambda x: max(0, x) * self.config.capital_gains_tax_rate
        )
        
        return quarterly
