#!/usr/bin/env python3
"""
Japanese Financial Statements Integration (EDINET)
日本財務諸表統合システム（EDINET）
"""

import asyncio
import aiohttp
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
import json
import logging
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup


@dataclass
class FinancialStatement:
    """財務諸表情報"""

    symbol: str
    company_name: str
    fiscal_year: str
    document_type: str  # 有価証券報告書, 四半期報告書, etc.
    filing_date: datetime

    # 損益計算書
    net_sales: float = 0.0
    operating_income: float = 0.0
    ordinary_income: float = 0.0
    net_income: float = 0.0

    # 貸借対照表
    total_assets: float = 0.0
    total_liabilities: float = 0.0
    net_assets: float = 0.0
    shareholders_equity: float = 0.0

    # キャッシュフロー
    operating_cash_flow: float = 0.0
    investing_cash_flow: float = 0.0
    financing_cash_flow: float = 0.0

    # 財務指標
    roe: float = 0.0  # 自己資本利益率
    roa: float = 0.0  # 総資産利益率
    debt_ratio: float = 0.0  # 負債比率
    current_ratio: float = 0.0  # 流動比率
    per: float = 0.0  # 株価収益率
    pbr: float = 0.0  # 純資産倍率


@dataclass
class CorporateDisclosure:
    """企業開示情報"""

    symbol: str
    company_name: str
    disclosure_type: str  # 適時開示, 決算短信, etc.
    title: str
    summary: str
    publication_date: datetime
    importance: str  # "high", "medium", "low"
    impact_on_price: str  # "positive", "negative", "neutral"


class EDINETClient:
    """EDINET APIクライアント"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = "https://disclosure.edinet-fsa.go.jp/api"
        self.logger = self._setup_logger()
        self.session = None

    def _setup_logger(self) -> logging.Logger:
        """ロガー設定"""
        logger = logging.getLogger("edinet_client")
        logger.setLevel(logging.INFO)

        handler = logging.FileHandler("logs/edinet.log", encoding="utf-8")
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    async def _create_session(self):
        """HTTPセッション作成"""
        if self.session is None:
            self.session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=60),
                headers={"User-Agent": "AGStock-EDINET/1.0"},
            )

    async def get_document_list(self, date: datetime, document_type: str = "all") -> List[Dict]:
        """文書リスト取得"""
        await self._create_session()

        # EDINET APIエンドポイント
        url = f"{self.base_url}/v1/documents.json"
        params = {"date": date.strftime("%Y-%m-%d"), "type": document_type}

        try:
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("results", [])
                else:
                    self.logger.error(f"Failed to get document list: {response.status}")
                    return []

        except Exception as e:
            self.logger.error(f"Error getting document list: {e}")
            return []

    async def get_document_content(self, document_id: str) -> Optional[bytes]:
        """文書コンテンツ取得"""
        await self._create_session()

        url = f"{self.base_url}/v1/documents/{document_id}"

        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    return await response.read()
                else:
                    self.logger.error(f"Failed to get document content: {response.status}")
                    return None

        except Exception as e:
            self.logger.error(f"Error getting document content: {e}")
            return None

    async def close(self):
        """セッションクローズ"""
        if self.session:
            await self.session.close()


class JapanFinancialAnalyzer:
    """日本財務分析システム"""

    def __init__(self, edinet_client: Optional[EDINETClient] = None):
        self.edinet_client = edinet_client or EDINETClient()
        self.logger = self._setup_logger()
        self.symbol_mapping = self._load_symbol_mapping()

    def _setup_logger(self) -> logging.Logger:
        """ロガー設定"""
        logger = logging.getLogger("japan_financial_analyzer")
        logger.setLevel(logging.INFO)

        handler = logging.FileHandler("logs/financial_analysis.log", encoding="utf-8")
        formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
        handler.setFormatter(formatter)
        logger.addHandler(handler)

        return logger

    def _load_symbol_mapping(self) -> Dict[str, str]:
        """証券コードと企業名のマッピング読み込み"""
        mapping = {
            "7203": "トヨタ自動車株式会社",
            "6758": "ソニーグループ株式会社",
            "9984": "ソフトバンクグループ株式会社",
            "6861": "キーエンス株式会社",
            "9983": "ファーストリテイリング株式会社",
            "8035": "東京エレクトロン株式会社",
            "4519": "中外製薬株式会社",
            "6702": "住友電気工業株式会社",
            "8306": "三菱UFJフィナンシャルグループ株式会社",
            "9432": "日本電信電話株式会社",
        }

        try:
            mapping_file = "data/japan_companies.json"
            with open(mapping_file, "r", encoding="utf-8") as f:
                file_mapping = json.load(f)
                return {**mapping, **file_mapping}
        except FileNotFoundError:
            return mapping

    async def get_financial_statements(self, symbol: str, years: int = 3) -> List[FinancialStatement]:
        """財務諸表取得"""
        company_name = self.symbol_mapping.get(symbol, f"企業{symbol}")
        statements = []

        # 過去N年分の財務諸表を取得
        end_date = datetime.now()
        start_date = end_date - timedelta(days=years * 365)

        for year in range(years):
            target_date = end_date - timedelta(days=year * 365)

            try:
                # 有価証券報告書を検索
                documents = await self._search_financial_documents(symbol, target_date)

                for doc in documents:
                    statement = await self._parse_financial_document(doc, symbol, company_name)
                    if statement:
                        statements.append(statement)

            except Exception as e:
                self.logger.error(f"Error getting financial statements for {symbol} year {year}: {e}")

        return statements

    async def _search_financial_documents(self, symbol: str, date: datetime) -> List[Dict]:
        """財務文書検索"""
        company_name = self.symbol_mapping.get(symbol, "")

        # 文書リスト取得
        documents = await self.edinet_client.get_document_list(date)

        # 企業名でフィルタリング
        filtered_docs = []
        for doc in documents:
            doc_company = doc.get("filerName", "")
            if company_name in doc_company or symbol in doc.get("docDescription", ""):
                doc_type = doc.get("docTypeCode", "")
                if doc_type in ["120", "130"]:  # 有価証券報告書, 四半期報告書
                    filtered_docs.append(doc)

        return filtered_docs

    async def _parse_financial_document(
        self, doc: Dict, symbol: str, company_name: str
    ) -> Optional[FinancialStatement]:
        """財務文書解析"""
        try:
            # 文書コンテンツ取得
            content = await self.edinet_client.get_document_content(doc["docID"])
            if not content:
                return None

            # XBRLファイル抽出（通常ZIP内に含まれる）
            xbrl_content = await self._extract_xbrl(content)
            if not xbrl_content:
                return None

            # XBRL解析
            return self._parse_xbrl_financial_data(xbrl_content, symbol, company_name, doc)

        except Exception as e:
            self.logger.error(f"Error parsing financial document for {symbol}: {e}")
            return None

    async def _extract_xbrl(self, zip_content: bytes) -> Optional[bytes]:
        """ZIPからXBRLファイル抽出"""
        try:
            with zipfile.ZipFile(io.BytesIO(zip_content)) as zip_file:
                for file_name in zip_file.namelist():
                    if file_name.endswith(".xbrl"):
                        return zip_file.read(file_name)
            return None
        except Exception as e:
            self.logger.error(f"Error extracting XBRL: {e}")
            return None

    def _parse_xbrl_financial_data(
        self, xbrl_content: bytes, symbol: str, company_name: str, doc: Dict
    ) -> Optional[FinancialStatement]:
        """XBRL財務データ解析"""
        try:
            # XBRL解析（簡易版）
            root = ET.fromstring(xbrl_content.decode("utf-8"))

            # 名前空間の処理
            namespaces = {
                "jppfs_cor": "http://disclosure.edinet-fsa.go.jp/taxonomy/jppfs_cor/2023-02-28",
                "xbrli": "http://www.xbrl.org/2003/instance",
            }

            # 財務データ抽出（XBRLタグ名は日本の会計基準に準拠）
            statement = FinancialStatement(
                symbol=symbol,
                company_name=company_name,
                fiscal_year=self._extract_fiscal_year(root, namespaces),
                document_type=self._get_document_type(doc),
                filing_date=datetime.fromisoformat(doc.get("submitDateTime", datetime.now().isoformat())),
                # 損益計算書
                net_sales=self._extract_value(root, "jppfs_cor:NetSales", namespaces),
                operating_income=self._extract_value(root, "jppfs_cor:OperatingIncome", namespaces),
                ordinary_income=self._extract_value(root, "jppfs_cor:OrdinaryIncome", namespaces),
                net_income=self._extract_value(root, "jppfs_cor:NetIncome", namespaces),
                # 貸借対照表
                total_assets=self._extract_value(root, "jppfs_cor:Assets", namespaces),
                total_liabilities=self._extract_value(root, "jppfs_cor:Liabilities", namespaces),
                net_assets=self._extract_value(root, "jppfs_cor:NetAssets", namespaces),
                shareholders_equity=self._extract_value(root, "jppfs_cor:ShareholdersEquity", namespaces),
                # キャッシュフロー
                operating_cash_flow=self._extract_value(
                    root, "jppfs_cor:CashFlowsFromUsedInOperatingActivities", namespaces
                ),
                investing_cash_flow=self._extract_value(
                    root, "jppfs_cor:CashFlowsFromUsedInInvestingActivities", namespaces
                ),
                financing_cash_flow=self._extract_value(
                    root, "jppfs_cor:CashFlowsFromUsedInFinancingActivities", namespaces
                ),
            )

            # 財務指標計算
            statement = self._calculate_financial_ratios(statement)

            return statement

        except Exception as e:
            self.logger.error(f"Error parsing XBRL for {symbol}: {e}")
            return None

    def _extract_fiscal_year(self, root: ET.Element, namespaces: Dict) -> str:
        """会計年度抽出"""
        try:
            element = root.find(".//xbrli:identifier", namespaces)
            if element is not None:
                # XBRLから会計年度を抽出
                return "2023"  # 簡易版
        except Exception as e:
            logging.getLogger(__name__).debug(f"Non-critical exception: {e}")
        return "2023"

    def _get_document_type(self, doc: Dict) -> str:
        """文書タイプ判定"""
        doc_type = doc.get("docTypeCode", "")
        type_map = {"120": "有価証券報告書", "130": "四半期報告書", "140": "半期報告書"}
        return type_map.get(doc_type, "その他")

    def _extract_value(self, root: ET.Element, xpath: str, namespaces: Dict) -> float:
        """XBRL値抽出"""
        try:
            element = root.find(f".//{xpath}", namespaces)
            if element is not None and element.text:
                # 単位変換（通常百万円単位）
                value = float(element.text.replace(",", ""))
                return value * 1000000  # 百万円→円
        except Exception as e:
            logging.getLogger(__name__).debug(f"Non-critical exception: {e}")
        return 0.0

    def _calculate_financial_ratios(self, statement: FinancialStatement) -> FinancialStatement:
        """財務指標計算"""
        # ROE（自己資本利益率）
        if statement.shareholders_equity > 0:
            statement.roe = (statement.net_income / statement.shareholders_equity) * 100

        # ROA（総資産利益率）
        if statement.total_assets > 0:
            statement.roa = (statement.net_income / statement.total_assets) * 100

        # 負債比率
        if statement.total_assets > 0:
            statement.debt_ratio = (statement.total_liabilities / statement.total_assets) * 100

        # PER、PBRは株価情報が必要なのでダミー値
        statement.per = 15.0
        statement.pbr = 1.2

        return statement

    async def get_timely_disclosures(self, symbol: str, days: int = 30) -> List[CorporateDisclosure]:
        """適時開示情報取得"""
        disclosures = []

        # 過去N日分の適時開示を取得
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        current_date = start_date
        while current_date <= end_date:
            try:
                # 適時開示文書検索
                documents = await self._search_disclosure_documents(symbol, current_date)

                for doc in documents:
                    disclosure = self._parse_disclosure_document(doc, symbol)
                    if disclosure:
                        disclosures.append(disclosure)

                current_date += timedelta(days=1)

            except Exception as e:
                self.logger.error(f"Error getting timely disclosures for {symbol}: {e}")

        # 重要度でソート
        disclosures.sort(key=lambda x: (x.importance, x.publication_date), reverse=True)

        return disclosures

    async def _search_disclosure_documents(self, symbol: str, date: datetime) -> List[Dict]:
        """適時開示文書検索"""
        company_name = self.symbol_mapping.get(symbol, "")

        # 文書リスト取得
        documents = await self.edinet_client.get_document_list(date, "tdnet")

        # 企業名でフィルタリング
        filtered_docs = []
        for doc in documents:
            doc_company = doc.get("filerName", "")
            if company_name in doc_company:
                filtered_docs.append(doc)

        return filtered_docs

    def _parse_disclosure_document(self, doc: Dict, symbol: str) -> Optional[CorporateDisclosure]:
        """適時開示文書解析"""
        try:
            # 重要度判定（簡易版）
            title = doc.get("docDescription", "")
            importance = self._assess_disclosure_importance(title)

            # 価格への影響評価
            impact = self._assess_price_impact(title, importance)

            return CorporateDisclosure(
                symbol=symbol,
                company_name=self.symbol_mapping.get(symbol, ""),
                disclosure_type="適時開示",
                title=title,
                summary=doc.get("docDescription", ""),
                publication_date=datetime.fromisoformat(doc.get("submitDateTime", datetime.now().isoformat())),
                importance=importance,
                impact_on_price=impact,
            )

        except Exception as e:
            self.logger.error(f"Error parsing disclosure document for {symbol}: {e}")
            return None

    def _assess_disclosure_importance(self, title: str) -> str:
        """開示重要度評価"""
        high_importance_keywords = [
            "決算",
            "業績",
            "配当",
            "増資",
            "減資",
            "合併",
            "買収",
            "分割",
            "上場廃止",
            "破産",
            "民事再生",
            "会社更生",
        ]

        medium_importance_keywords = [
            "役員",
            "取締役",
            "監査役",
            "定時株主総会",
            "臨時株主総会",
            "新製品",
            "新技術",
            "特許",
            "提携",
        ]

        title_lower = title.lower()

        for keyword in high_importance_keywords:
            if keyword in title:
                return "high"

        for keyword in medium_importance_keywords:
            if keyword in title:
                return "medium"

        return "low"

    def _assess_price_impact(self, title: str, importance: str) -> str:
        """価格への影響評価"""
        if importance == "high":
            if any(word in title for word in ["増収", "増益", "配当増"]):
                return "positive"
            elif any(word in title for word in ["減収", "減益", "配当減", "損失"]):
                return "negative"

        return "neutral"

    def analyze_financial_health(self, statements: List[FinancialStatement]) -> Dict:
        """財務健全性分析"""
        if not statements:
            return {"error": "No financial statements available"}

        # 最新の財務諸表
        latest = statements[0]

        # 財務健全性スコア計算
        health_score = self._calculate_health_score(latest)

        # トレンド分析
        trends = self._analyze_trends(statements)

        return {
            "health_score": health_score,
            "health_rating": self._get_health_rating(health_score),
            "current_metrics": {
                "roe": latest.roe,
                "roa": latest.roa,
                "debt_ratio": latest.debt_ratio,
                "current_ratio": latest.current_ratio,
                "net_profit_margin": (latest.net_income / latest.net_sales * 100) if latest.net_sales > 0 else 0,
            },
            "trends": trends,
            "recommendations": self._generate_financial_recommendations(latest, health_score, trends),
        }

    def _calculate_health_score(self, statement: FinancialStatement) -> float:
        """財務健全性スコア計算（0-100）"""
        score = 50  # ベーススコア

        # ROE評価
        if statement.roe > 15:
            score += 20
        elif statement.roe > 10:
            score += 10
        elif statement.roe > 5:
            score += 5
        elif statement.roe < 0:
            score -= 30

        # 負債比率評価
        if statement.debt_ratio < 30:
            score += 15
        elif statement.debt_ratio < 50:
            score += 10
        elif statement.debt_ratio < 70:
            score += 5
        elif statement.debt_ratio > 80:
            score -= 20

        # 純利益評価
        if statement.net_income > 0:
            score += 15
        else:
            score -= 25

        return max(0, min(100, score))

    def _get_health_rating(self, score: float) -> str:
        """健全性評価"""
        if score >= 80:
            return "優良"
        elif score >= 60:
            return "良好"
        elif score >= 40:
            return "普通"
        elif score >= 20:
            return "要注意"
        else:
            return "危険"

    def _analyze_trends(self, statements: List[FinancialStatement]) -> Dict:
        """トレンド分析"""
        if len(statements) < 2:
            return {"error": "Insufficient data for trend analysis"}

        latest = statements[0]
        previous = statements[1]

        # 成長率計算
        sales_growth = (
            ((latest.net_sales - previous.net_sales) / previous.net_sales * 100) if previous.net_sales > 0 else 0
        )
        profit_growth = (
            ((latest.net_income - previous.net_income) / abs(previous.net_income) * 100)
            if previous.net_income != 0
            else 0
        )

        return {
            "sales_growth": sales_growth,
            "profit_growth": profit_growth,
            "roe_trend": "improving" if latest.roe > previous.roe else "declining",
            "debt_trend": "improving" if latest.debt_ratio < previous.debt_ratio else "declining",
        }

    def _generate_financial_recommendations(
        self, statement: FinancialStatement, health_score: float, trends: Dict
    ) -> List[str]:
        """財務関連助言生成"""
        recommendations = []

        # 健全性に基づく助言
        if health_score < 40:
            recommendations.append("財務健全性に懸念があります。詳細な分析を推奨します。")
        elif health_score > 80:
            recommendations.append("財務状況は良好です。投資候補として検討できます。")

        # トレンドに基づく助言
        if trends.get("sales_growth", 0) > 10:
            recommendations.append("売上成長率が高いです。成長企業として注目されています。")
        elif trends.get("sales_growth", 0) < -5:
            recommendations.append("売上が減少傾向にあります。業績回復の兆しを注視してください。")

        # ROEに基づく助言
        if statement.roe > 15:
            recommendations.append("ROEが15%を超えています。収益性が高い企業です。")
        elif statement.roe < 5:
            recommendations.append("ROEが低めです。収益性改善の余地があります。")

        return recommendations

    async def close(self):
        """クリーンアップ"""
        await self.edinet_client.close()


# 使用例
async def main():
    """メイン実行関数"""
    analyzer = JapanFinancialAnalyzer()

    try:
        # 財務諸表分析
        print("📊 財務諸表を分析中...")
        statements = await analyzer.get_financial_statements("7203", years=3)

        if statements:
            print(f"\n📈 トヨタ自動車 財務データ:")
            latest = statements[0]
            print(f"売上高: {latest.net_sales:,.0f}円")
            print(f"純利益: {latest.net_income:,.0f}円")
            print(f"ROE: {latest.roe:.1f}%")
            print(f"負債比率: {latest.debt_ratio:.1f}%")

            # 財務健全性分析
            health = analyzer.analyze_financial_health(statements)
            print(f"\n健全性評価: {health['health_rating']} (スコア: {health['health_score']})")

            for rec in health["recommendations"]:
                print(f"- {rec}")

        # 適時開示情報
        print("\n📢 適時開示情報を取得中...")
        disclosures = await analyzer.get_timely_disclosures("7203", days=30)

        print(f"最新開示情報: {len(disclosures)}件")
        for disclosure in disclosures[:3]:
            print(f"- {disclosure.title} ({disclosure.importance})")

    finally:
        await analyzer.close()


if __name__ == "__main__":
    import io

    asyncio.run(main())
