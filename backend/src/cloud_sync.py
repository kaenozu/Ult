"""
AGStock PWA クラウド同期機能
データの自動同期とオフライン対応
"""

import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import aiohttp
import cloudscraper
from pathlib import Path

logger = logging.getLogger(__name__)


class CloudSyncManager:
    """
    PWA用クラウド同期マネージャ
    オフライン対応とデータ同期を管理
    """

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.sync_urls = {
            "portfolio": "https://api.agstock.com/sync/portfolio",
            "market_data": "https://api.agstock.com/sync/market_data",
            "user_preferences": "https://api.agstock.com/sync/preferences",
        }
        self.local_cache = Path("data/offline_cache")
        self.local_cache.mkdir(exist_ok=True)

    async def sync_all_data(self) -> Dict[str, Any]:
        """
        すべてのデータを同期

        Returns:
            同期結果
        """
        sync_results = {}

        try:
            # 並列で各データを同期
            tasks = [
                self.sync_portfolio_data(),
                self.sync_market_data(),
                self.sync_user_preferences(),
            ]

            results = await asyncio.gather(*tasks, return_exceptions=True)

            sync_results["portfolio"] = (
                results[0] if not isinstance(results[0], Exception) else {"error": str(results[0])}
            )
            sync_results["market_data"] = (
                results[1] if not isinstance(results[1], Exception) else {"error": str(results[1])}
            )
            sync_results["user_preferences"] = (
                results[2] if not isinstance(results[2], Exception) else {"error": str(results[2])}
            )

            # 最終同期時刻を保存
            sync_results["last_sync"] = datetime.now().isoformat()
            await self.save_sync_result(sync_results)

            logger.info("Cloud sync completed successfully")
            return sync_results

        except Exception as e:
            logger.error(f"Cloud sync failed: {e}")
            return {"error": str(e)}

    async def sync_portfolio_data(self) -> Dict[str, Any]:
        """ポートフォリオデータを同期"""
        try:
            # ローカルデータ読み込み
            local_data = await self.load_local_portfolio()

            # リモートデータ取得
            remote_data = await self.fetch_remote_portfolio()

            # データマージ
            merged_data = self.merge_portfolio_data(local_data, remote_data)

            # ローカルに保存
            await self.save_portfolio_data(merged_data)

            return {
                "success": True,
                "merged_count": len(merged_data.get("positions", [])),
                "last_updated": merged_data.get("timestamp"),
            }

        except Exception as e:
            logger.error(f"Portfolio sync failed: {e}")
            return {"success": False, "error": str(e)}

    async def sync_market_data(self) -> Dict[str, Any]:
        """市場データを同期"""
        try:
            # 最後の同期時刻を取得
            last_sync = await self.get_last_sync_timestamp("market_data")

            # 差分データ取得
            remote_data = await self.fetch_market_data_updates(last_sync)

            # ローカルに保存
            if remote_data:
                await self.save_market_data(remote_data)

                return {
                    "success": True,
                    "update_count": len(remote_data.get("updates", [])),
                    "last_updated": datetime.now().isoformat(),
                }
            else:
                return {"success": True, "message": "No updates available"}

        except Exception as e:
            logger.error(f"Market data sync failed: {e}")
            return {"success": False, "error": str(e)}

    async def sync_user_preferences(self) -> Dict[str, Any]:
        """ユーザー設定を同期"""
        try:
            # ローカル設定読み込み
            local_prefs = await self.load_local_preferences()

            # リモート設定取得
            remote_prefs = await self.fetch_remote_preferences()

            # 設定マージ
            merged_prefs = self.merge_preferences(local_prefs, remote_prefs)

            # 保存
            await self.save_user_preferences(merged_prefs)

            return {
                "success": True,
                "settings_count": len(merged_prefs),
                "last_updated": datetime.now().isoformat(),
            }

        except Exception as e:
            logger.error(f"Preferences sync failed: {e}")
            return {"success": False, "error": str(e)}

    async def load_local_portfolio(self) -> Dict[str, Any]:
        """ローカルポートフォリオデータを読み込み"""
        portfolio_file = self.local_cache / "portfolio.json"

        if portfolio_file.exists():
            try:
                with open(portfolio_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load local portfolio: {e}")

        return {"positions": [], "timestamp": None}

    async def fetch_remote_portfolio(self) -> Dict[str, Any]:
        """リモートポートフォリオデータを取得"""
        headers = self.get_auth_headers()

        try:
            async with cloudscraper.CloudScraper() as session:
                async with session.get(
                    self.sync_urls["portfolio"],
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.warning(f"Remote portfolio fetch failed: {response.status}")
                        return {}

        except asyncio.TimeoutError:
            logger.warning("Remote portfolio fetch timed out")
            return {}
        except Exception as e:
            logger.error(f"Remote portfolio fetch error: {e}")
            return {}

    def merge_portfolio_data(self, local: Dict, remote: Dict) -> Dict[str, Any]:
        """ポートフォリオデータをマージ"""
        merged_positions = []

        # ローカルポジションを基準に
        local_positions = local.get("positions", [])
        remote_positions = remote.get("positions", [])

        # タイムスタンプでマージ
        for local_pos in local_positions:
            matching_remote = next(
                (rp for rp in remote_positions if rp.get("ticker") == local_pos.get("ticker")),
                None,
            )

            if matching_remote:
                # より新しいデータを採用
                if (matching_remote.get("timestamp") or "") > (local_pos.get("timestamp") or ""):
                    merged_positions.append(matching_remote)
                else:
                    merged_positions.append(local_pos)
            else:
                merged_positions.append(local_pos)

        # リモートのみのポジションを追加
        local_tickers = {pos.get("ticker") for pos in local_positions}
        for remote_pos in remote_positions:
            if remote_pos.get("ticker") not in local_tickers:
                merged_positions.append(remote_pos)

        return {
            "positions": merged_positions,
            "timestamp": datetime.now().isoformat(),
            "source": "merged",
        }

    async def save_portfolio_data(self, data: Dict[str, Any]):
        """ポートフォリオデータを保存"""
        portfolio_file = self.local_cache / "portfolio.json"

        try:
            with open(portfolio_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)

        except Exception as e:
            logger.error(f"Failed to save portfolio data: {e}")

    async def fetch_market_data_updates(self, last_sync: Optional[str]) -> Dict[str, Any]:
        """市場データの差分更新を取得"""
        if not last_sync:
            return {}

        headers = self.get_auth_headers()
        params = {"since": last_sync}

        try:
            async with cloudscraper.CloudScraper() as session:
                async with session.get(
                    f"{self.sync_urls['market_data']}/updates",
                    headers=headers,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=10),
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        return {}

        except Exception as e:
            logger.error(f"Market data updates fetch error: {e}")
            return {}

    async def save_market_data(self, data: Dict[str, Any]):
        """市場データを保存"""
        market_file = self.local_cache / "market_data.json"

        try:
            # 既存データとマージ
            existing_data = {}
            if market_file.exists():
                with open(market_file, "r", encoding="utf-8") as f:
                    existing_data = json.load(f)

            # 更新データを追加
            updates = data.get("updates", [])
            for update in updates:
                ticker = update.get("ticker")
                if ticker:
                    existing_data[ticker] = update

            # 保存
            with open(market_file, "w", encoding="utf-8") as f:
                json.dump(existing_data, f, ensure_ascii=False, indent=2)

        except Exception as e:
            logger.error(f"Failed to save market data: {e}")

    def get_auth_headers(self) -> Dict[str, str]:
        """認証ヘッダーを取得"""
        return {
            "Authorization": f"Bearer {self.config.get('api_token', '')}",
            "Content-Type": "application/json",
        }

    async def get_last_sync_timestamp(self, data_type: str) -> Optional[str]:
        """最後の同期時刻を取得"""
        sync_file = self.local_cache / "sync_status.json"

        if sync_file.exists():
            try:
                with open(sync_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get(data_type)
            except Exception as e:
                logger.error(f"Failed to read sync status: {e}")

        return None

    async def save_sync_result(self, result: Dict[str, Any]):
        """同期結果を保存"""
        sync_file = self.local_cache / "sync_status.json"

        try:
            with open(sync_file, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save sync result: {e}")

    async def fetch_remote_preferences(self) -> Dict[str, Any]:
        """リモート設定を取得"""
        headers = self.get_auth_headers()

        try:
            async with cloudscraper.CloudScraper() as session:
                async with session.get(
                    self.sync_urls["user_preferences"],
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5),
                ) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        return {}

        except Exception as e:
            logger.error(f"Remote preferences fetch error: {e}")
            return {}

    async def load_local_preferences(self) -> Dict[str, Any]:
        """ローカル設定を読み込み"""
        prefs_file = self.local_cache / "preferences.json"

        if prefs_file.exists():
            try:
                with open(prefs_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load local preferences: {e}")

        return {}

    def merge_preferences(self, local: Dict, remote: Dict) -> Dict[str, Any]:
        """設定をマージ"""
        merged = local.copy()
        merged.update(remote)  # リモート設定で上書き
        merged["last_merged"] = datetime.now().isoformat()
        return merged

    async def save_user_preferences(self, data: Dict[str, Any]):
        """ユーザー設定を保存"""
        prefs_file = self.local_cache / "preferences.json"

        try:
            with open(prefs_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.error(f"Failed to save preferences: {e}")


class BackgroundSyncScheduler:
    """
    バックグラウンド同期スケジューラー
    """

    def __init__(self, sync_manager: CloudSyncManager):
        self.sync_manager = sync_manager
        self.sync_intervals = {
            "portfolio": timedelta(minutes=15),  # 15分毎
            "market_data": timedelta(minutes=5),  # 5分毎
            "preferences": timedelta(hours=1),  # 1時間毎
        }

    async def start_background_sync(self):
        """バックグラウンド同期を開始"""
        logger.info("Starting background sync scheduler")

        tasks = [
            self.periodic_sync("portfolio", self.sync_intervals["portfolio"]),
            self.periodic_sync("market_data", self.sync_intervals["market_data"]),
            self.periodic_sync("preferences", self.sync_intervals["preferences"]),
        ]

        await asyncio.gather(*tasks)

    async def periodic_sync(self, data_type: str, interval: timedelta):
        """定期同期を実行"""
        while True:
            try:
                if data_type == "portfolio":
                    result = await self.sync_manager.sync_portfolio_data()
                elif data_type == "market_data":
                    result = await self.sync_manager.sync_market_data()
                elif data_type == "preferences":
                    result = await self.sync_manager.sync_user_preferences()

                logger.info(f"{data_type} sync completed: {result}")

                # 次の同期まで待機
                await asyncio.sleep(interval.total_seconds())

            except Exception as e:
                logger.error(f"{data_type} sync failed: {e}")
                await asyncio.sleep(60)  # エラー時は1分待機


# グローバルインスタンス
cloud_sync_manager = CloudSyncManager()
background_sync = BackgroundSyncScheduler(cloud_sync_manager)
