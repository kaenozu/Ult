"""
税金レポート生成モジュール

確定申告用のレポートを生成。
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import pandas as pd

from .calculator import TaxCalculator, TaxSummary

logger = logging.getLogger(__name__)


class TaxReportGenerator:
    """税金レポート生成クラス"""
    
    def __init__(self, output_dir: str = "reports/tax"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.calculator = TaxCalculator()
    
    def generate_annual_report(
        self,
        trades: List[Dict],
        dividends: Optional[List[Dict]] = None,
        year: Optional[int] = None,
    ) -> Dict:
        """年次税金レポートを生成"""
        year = year or datetime.now().year
        
        # 税金計算
        trade_summary = self.calculator.calculate_trade_tax(trades)
        dividend_tax = self.calculator.calculate_dividend_tax(dividends or [])
        
        report = {
            "report_date": datetime.now().isoformat(),
            "tax_year": year,
            "summary": trade_summary.to_dict(),
            "dividend_tax": dividend_tax,
            "total_tax": trade_summary.total_tax + dividend_tax,
            "nisa_savings_potential": self.calculator.estimate_nisa_savings(trades),
        }
        
        return report
    
    def generate_trade_detail_report(self, trades: List[Dict]) -> pd.DataFrame:
        """取引明細レポートを生成"""
        if not trades:
            return pd.DataFrame()
        
        df = pd.DataFrame(trades)
        
        # 必要なカラムを整形
        columns_map = {
            "ticker": "銘柄コード",
            "entry_date": "取得日",
            "exit_date": "譲渡日",
            "entry_price": "取得価格",
            "exit_price": "譲渡価格",
            "quantity": "数量",
            "pnl": "損益",
        }
        
        result = df.rename(columns={k: v for k, v in columns_map.items() if k in df.columns})
        
        # 損益計算
        if "損益" not in result.columns:
            if "return" in df.columns:
                result["損益"] = df["return"] * df.get("entry_price", 1) * df.get("quantity", 1)
        
        return result
    
    def export_csv(self, trades: List[Dict], filename: str = "tax_report.csv") -> str:
        """CSVエクスポート"""
        df = self.generate_trade_detail_report(trades)
        filepath = self.output_dir / filename
        df.to_csv(filepath, index=False, encoding="utf-8-sig")
        logger.info(f"Exported tax report to {filepath}")
        return str(filepath)
    
    def export_excel(self, trades: List[Dict], dividends: Optional[List[Dict]] = None, filename: str = "tax_report.xlsx") -> str:
        """Excelエクスポート"""
        filepath = self.output_dir / filename
        
        with pd.ExcelWriter(filepath, engine="openpyxl") as writer:
            # 取引明細
            trade_df = self.generate_trade_detail_report(trades)
            trade_df.to_excel(writer, sheet_name="取引明細", index=False)
            
            # 四半期サマリー
            quarterly = self.calculator.get_quarterly_summary(trades)
            if not quarterly.empty:
                quarterly.to_excel(writer, sheet_name="四半期サマリー")
            
            # 年次サマリー
            annual = self.generate_annual_report(trades, dividends)
            summary_df = pd.DataFrame([annual["summary"]])
            summary_df.to_excel(writer, sheet_name="年次サマリー", index=False)
        
        logger.info(f"Exported tax report to {filepath}")
        return str(filepath)
    
    def generate_kakutei_shinkoku_data(self, trades: List[Dict]) -> Dict:
        """
        確定申告用データを生成
        
        国税庁の確定申告書作成コーナーで使用できる形式。
        """
        summary = self.calculator.calculate_trade_tax(trades)
        
        return {
            "所得の種類": "株式等の譲渡所得",
            "収入金額": summary.total_gains,
            "必要経費": 0,  # 手数料等があれば追加
            "差引金額": summary.net_gains,
            "所得金額": summary.net_gains,
            "源泉徴収税額": 0,  # 特定口座の場合
            "申告納税額": summary.capital_gains_tax,
        }
