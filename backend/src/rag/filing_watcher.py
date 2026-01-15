"""
Filing Watcher
適時開示や決算短信PDFを監視し、自動分析をトリガーする
"""

import logging
import os
import time
import shutil
from datetime import datetime
from typing import Dict, Any

from src.rag.pdf_loader import PDFLoader
from src.rag.earnings_rag import EarningsRAG
from src.rag.earnings_analyzer import EarningsAnalyzer
from src.data.earnings_history import EarningsHistory
from src.smart_notifier import SmartNotifier
from src.execution.event_trader import EventTrader

logger = logging.getLogger(__name__)


class FilingWatcher:
    """
    適時開示資料（PDF）のディレクトリ監視または擬似スキャン
    """

    def __init__(
        self,
        watch_dir: str = "./data/new_filings",
        processed_dir: str = "./data/processed_filings",
    ):
        self.watch_dir = watch_dir
        self.processed_dir = processed_dir
        self.loader = PDFLoader()
        self.rag = EarningsRAG()
        self.analyzer = EarningsAnalyzer()
        self.history = EarningsHistory()
        self.notifier = SmartNotifier()
        self.event_trader = EventTrader(dry_run=True)  # Default to dry-run for safety

        # ディレクトリ準備
        os.makedirs(watch_dir, exist_ok=True)
        os.makedirs(processed_dir, exist_ok=True)

        self.is_running = False

    def start_monitoring(self, interval: int = 60):
        """監視を開始（ノンブロッキングな実行は呼び出し側で制御するか、ループ内で呼ぶ）"""
        logger.info(f"FilingWatcher starting. Watching: {self.watch_dir}")
        self.is_running = True

        while self.is_running:
            try:
                self.scan_and_process()
            except Exception as e:
                logger.error(f"Error during scan: {e}")

            time.sleep(interval)

    def stop_monitoring(self):
        self.is_running = False
        logger.info("FilingWatcher stopping...")

    def scan_and_process(self):
        """ディレクトリをスキャンして未処理のPDFを処理"""
        files = [f for f in os.listdir(self.watch_dir) if f.lower().endswith(".pdf")]

        if not files:
            return

        logger.info(f"Found {len(files)} new filings to process")

        for filename in files:
            file_path = os.path.join(self.watch_dir, filename)
            logger.info(f"Processing filing: {filename}")

            try:
                # 1. 分析実行
                analysis_result = self._process_file(file_path)

                if analysis_result:
                    # 2. 通知
                    self._send_notification(analysis_result)

                    # 3. 自動売買判定 (Event-Driven Execution)
                    trade_result = self.event_trader.handle_high_impact_event(analysis_result)
                    if trade_result.get("status") == "success":
                        logger.info(f"Event-driven trade executed for {filename}")

                    # 4. 移動（処理済みへ）
                    dest_path = os.path.join(
                        self.processed_dir,
                        f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{filename}",
                    )
                    shutil.move(file_path, dest_path)
                    logger.info(f"Moved {filename} to processed directory")

            except Exception as e:
                logger.error(f"Failed to process {filename}: {e}")

    def _process_file(self, file_path: str) -> Dict[str, Any]:
        """個別のファイルを処理"""
        # PDF読み込み
        pdf_data = self.loader.load_pdf(file_path)
        if not pdf_data.get("text"):
            logger.warning(f"No text extracted from {file_path}")
            return None

        metadata = pdf_data.get("metadata", {})
        ticker = metadata.get("ticker", "UNKNOWN")
        company = metadata.get("company", "Unknown")

        # RAGインデックス化
        doc_id = f"{ticker}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.rag.index_document(pdf_data, doc_id)

        # 分析
        result = self.analyzer.analyze(pdf_data, self.rag, doc_id)

        # 履歴保存
        self.history.save_analysis(result, ticker=ticker)

        logger.info(f"Analysis completed for {company} ({ticker})")
        return {"ticker": ticker, "company": company, "analysis": result}

    def _send_notification(self, data: Dict[str, Any]):
        """通知を送信"""
        ticker = data["ticker"]
        company = data["company"]
        analysis = data["analysis"]

        rec = analysis.get("recommendation", "HOLD")
        sent = analysis.get("sentiment", "NEUTRAL")
        reason = analysis.get("reasoning", "")

        emoji = "🚀" if rec == "BUY" else "📉" if rec == "SELL" else "⚖️"

        message = (
            f"{emoji} 【決算速報】 {company} ({ticker})\n"
            f"判断: {rec} | センチメント: {sent}\n"
            f"理由: {reason}\n"
            f"分析完了。AI投資委員会に反映されます。"
        )

        self.notifier.send_text(message, title=f"Filing Analysis: {ticker}")
        logger.info(f"Notification sent for {ticker}")


if __name__ == "__main__":
    # Test
    logging.basicConfig(level=logging.INFO)
    watcher = FilingWatcher()
    watcher.scan_and_process()
