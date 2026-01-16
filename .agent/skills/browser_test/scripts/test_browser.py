#!/usr/bin/env python3
"""
AGStock Ult Browser Testing Agent

Webアプリケーションの動作確認を自動化するブラウザテストスキル
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime

# プロジェクトルートをパスに追加
project_root = Path(__file__).resolve().parent.parent.parent


@dataclass
class TestResult:
    """テスト結果"""

    name: str
    status: str  # pass, fail, skip
    duration: float
    error: Optional[str] = None
    screenshot_path: Optional[str] = None


@dataclass
class BrowserTestConfig:
    """ブラウザテスト設定"""

    headless: bool = True
    url: str = "http://localhost:3000"
    screenshots: bool = False
    report: bool = False
    timeout: int = 10
    screenshot_dir: str = "screenshots"


class BrowserTestAgent:
    """ブラウザテストエージェント"""

    def __init__(self, config: BrowserTestConfig):
        self.config = config
        self.results: List[TestResult] = []
        self.start_time = None

        # スクリーンショットディレクトリ作成
        if config.screenshots:
            self.screenshot_dir = project_root / config.screenshot_dir
            self.screenshot_dir.mkdir(exist_ok=True)

    def setup_driver(self) -> bool:
        """WebDriverのセットアップ"""
        try:
            print("[SETUP] WebDriverを初期化中...")

            # Seleniumのインポートチェック
            try:
                from selenium import webdriver
                from selenium.webdriver.common.by import By
                from selenium.webdriver.support.ui import WebDriverWait
                from selenium.webdriver.support import expected_conditions as EC
                from selenium.webdriver.chrome.options import Options
                from selenium.webdriver.chrome.service import Service
                from selenium.common.exceptions import (
                    TimeoutException,
                    NoSuchElementException,
                )
            except ImportError:
                print("[ERROR] Seleniumがインストールされていません")
                print("  pip install selenium selenium-manager")
                return False

            # Chromeオプション設定
            options = Options()
            if self.config.headless:
                options.add_argument("--headless")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--disable-gpu")
            options.add_argument("--window-size=1920,1080")

            # WebDriver起動
            try:
                self.driver = webdriver.Chrome(options=options)
                self.driver.implicitly_wait(5)
                self.wait = WebDriverWait(self.driver, self.config.timeout)

                # Seleniumのクラスを保存
                self.By = By
                self.EC = EC
                self.TimeoutException = TimeoutException
                self.NoSuchElementException = NoSuchElementException

                print("[SUCCESS] WebDriverが正常に起動しました")
                return True

            except Exception as e:
                print(f"[ERROR] WebDriver起動失敗: {e}")
                print("  Chromeブラウザがインストールされているか確認してください")
                return False

        except Exception as e:
            print(f"[ERROR] WebDriverセットアップ失敗: {e}")
            return False

    def take_screenshot(self, test_name: str) -> Optional[str]:
        """スクリーンショット撮影"""
        if not self.config.screenshots:
            return None

        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{test_name}_{timestamp}.png"
            screenshot_path = self.screenshot_dir / filename

            self.driver.save_screenshot(str(screenshot_path))
            print(f"[SCREENSHOT] {filename}を保存しました")
            return str(screenshot_path)

        except Exception as e:
            print(f"[ERROR] スクリーンショット撮影失敗: {e}")
            return None

    def run_test(self, test_name: str, test_func) -> TestResult:
        """個別テストの実行"""
        start_time = time.time()
        print(f"[TEST] {test_name} を実行中...")

        try:
            test_func()
            duration = time.time() - start_time
            screenshot = self.take_screenshot(test_name)

            result = TestResult(
                name=test_name,
                status="pass",
                duration=duration,
                screenshot_path=screenshot,
            )
            print(f"[PASS] {test_name} ({duration:.2f}s)")

        except Exception as e:
            duration = time.time() - start_time
            screenshot = self.take_screenshot(f"{test_name}_error")

            result = TestResult(
                name=test_name,
                status="fail",
                duration=duration,
                error=str(e),
                screenshot_path=screenshot,
            )
            print(f"[FAIL] {test_name} ({duration:.2f}s) - {e}")

        self.results.append(result)
        return result

    def test_page_loading(self):
        """ページ読み込みテスト"""
        self.driver.get(self.config.url)

        # ページタイトル確認
        title = self.driver.title
        if not title or title == "about:blank":
            raise Exception("ページタイトルが取得できません")

        # 主要要素の確認
        try:
            self.wait.until(
                self.EC.presence_of_element_located((self.By.TAG_NAME, "main"))
            )
        except self.TimeoutException:
            raise Exception("メインコンテンツが読み込まれませんでした")

    def test_navigation(self):
        """ナビゲーションテスト"""
        # 設定リンク確認
        try:
            settings_link = self.driver.find_element(self.By.LINK_TEXT, "設定")
            settings_link.click()

            # 設定ページに遷移したか確認
            self.wait.until(self.EC.url_contains("/settings"))

            # ホームに戻る
            self.driver.get(self.config.url)

        except self.NoSuchElementException:
            raise Exception("設定リンクが見つかりません")

    def test_components(self):
        """コンポーネント表示テスト"""
        self.driver.get(self.config.url)

        # 主要コンポーネントの存在確認
        components_to_check = [
            ("Portfolio Summary", "ポートフォリオ"),
            ("Signal Cards", "AI"),
            ("Auto Trade Controls", "自動売買"),
        ]

        for name, keyword in components_to_check:
            try:
                elements = self.driver.find_elements(
                    self.By.XPATH, f"//*[contains(text(), '{keyword}')]"
                )
                if not elements:
                    raise Exception(f"{name}コンポーネントが見つかりません")
            except self.NoSuchElementException:
                raise Exception(f"{name}コンポーネントの確認に失敗しました")

    def test_responsive_design(self):
        """レスポンシブデザインテスト"""
        self.driver.get(self.config.url)

        # モバイルサイズに変更
        self.driver.set_window_size(375, 667)
        time.sleep(1)

        # 主要要素が表示されるか確認
        try:
            main = self.driver.find_element(self.By.TAG_NAME, "main")
            if not main.is_displayed():
                raise Exception("モバイル表示でメインコンテンツが表示されません")
        except self.NoSuchElementException:
            raise Exception("モバイル表示テスト失敗")

        # デスクトップサイズに戻す
        self.driver.set_window_size(1920, 1080)

    def test_error_handling(self):
        """エラーハンドリングテスト"""
        # 存在しないページにアクセス
        self.driver.get(f"{self.config.url}/nonexistent-page")

        # 404ページまたはエラーハンドリングが表示されるか確認
        time.sleep(2)

        # エラーが適切に処理されているか（500エラーでないか）
        status = self.driver.execute_script(
            "return window.performance?.getEntriesByType('navigation')[0]?.responseStatus || 200"
        )

        # 500サーバーエラーでないことを確認
        if status == 500:
            raise Exception("サーバーエラーが適切にハンドリングされていません")

    def test_api_integration(self):
        """API連携テスト"""
        self.driver.get(self.config.url)
        time.sleep(3)  # API呼び出しの待機

        # JavaScriptでAPIの状態を確認
        api_status = self.driver.execute_script("""
            // APIリクエストの状態を確認
            const requests = performance.getEntriesByType('resource');
            const apiRequests = requests.filter(req => req.name.includes('/api/'));
            
            if (apiRequests.length === 0) {
                return 'no_api_calls';
            }
            
            const failedRequests = apiRequests.filter(req => 
                req.responseStatus >= 400
            );
            
            return failedRequests.length > 0 ? 'api_errors' : 'api_success';
        """)

        if api_status == "no_api_calls":
            raise Exception("APIが呼び出されていません")
        elif api_status == "api_errors":
            raise Exception("APIエラーが発生しています")

    def run_all_tests(self) -> Dict[str, Any]:
        """全テスト実行"""
        print("[START] ブラウザテストを開始します")
        print("=" * 50)

        self.start_time = time.time()

        if not self.setup_driver():
            return {"error": "WebDriverのセットアップに失敗しました"}

        try:
            # テスト実行
            self.run_test("ページ読み込み", self.test_page_loading)
            self.run_test("ナビゲーション", self.test_navigation)
            self.run_test("コンポーネント表示", self.test_components)
            self.run_test("レスポンシブデザイン", self.test_responsive_design)
            self.run_test("API連携", self.test_api_integration)
            self.run_test("エラーハンドリング", self.test_error_handling)

            total_time = time.time() - self.start_time

            # 結果集計
            passed = len([r for r in self.results if r.status == "pass"])
            failed = len([r for r in self.results if r.status == "fail"])

            print(f"\n[RESULTS] テスト完了 ({total_time:.2f}s)")
            print(f"  合計: {len(self.results)}件")
            print(f"  成功: {passed}件")
            print(f"  失敗: {failed}件")

            return self.generate_report(total_time)

        finally:
            self.cleanup()

    def generate_report(self, total_time: float) -> Dict[str, Any]:
        """テストレポート生成"""
        passed = len([r for r in self.results if r.status == "pass"])
        failed = len([r for r in self.results if r.status == "fail"])

        report = {
            "summary": {
                "total_tests": len(self.results),
                "passed": passed,
                "failed": failed,
                "success_rate": f"{(passed / len(self.results) * 100):.1f}%"
                if self.results
                else "0%",
                "total_duration": total_time,
                "url": self.config.url,
                "timestamp": datetime.now().isoformat(),
            },
            "results": [
                {
                    "name": r.name,
                    "status": r.status,
                    "duration": r.duration,
                    "error": r.error,
                    "screenshot": r.screenshot_path,
                }
                for r in self.results
            ],
            "config": {
                "headless": self.config.headless,
                "screenshots": self.config.screenshots,
                "timeout": self.config.timeout,
            },
        }

        # HTMLレポート生成（オプション）
        if self.config.report:
            self.generate_html_report(report)

        return report

    def generate_html_report(self, report: Dict[str, Any]):
        """HTMLレポート生成"""
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <title>Browser Test Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background: #f5f5f5; padding: 20px; border-radius: 5px; }}
        .summary {{ margin: 20px 0; }}
        .pass {{ color: green; }}
        .fail {{ color: red; }}
        .test-result {{ margin: 10px 0; padding: 10px; border: 1px solid #ddd; }}
        .screenshot {{ max-width: 300px; margin-top: 10px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Browser Test Report</h1>
        <div class="summary">
            <p><strong>URL:</strong> {report["summary"]["url"]}</p>
            <p><strong>Timestamp:</strong> {report["summary"]["timestamp"]}</p>
            <p><strong>Total Tests:</strong> {report["summary"]["total_tests"]}</p>
            <p class="pass"><strong>Passed:</strong> {report["summary"]["passed"]}</p>
            <p class="fail"><strong>Failed:</strong> {report["summary"]["failed"]}</p>
            <p><strong>Success Rate:</strong> {report["summary"]["success_rate"]}</p>
            <p><strong>Total Duration:</strong> {report["summary"]["total_duration"]:.2f}s</p>
        </div>
    </div>
    
    <h2>Test Results</h2>
"""

        for result in report["results"]:
            status_class = result["status"]
            html_content += f"""
    <div class="test-result">
        <h3 class="{status_class}">{result["name"]} - {result["status"].upper()}</h3>
        <p>Duration: {result["duration"]:.2f}s</p>
"""
            if result.get("error"):
                html_content += f'        <p class="fail"><strong>Error:</strong> {result["error"]}</p>\n'
            if result.get("screenshot"):
                html_content += f'        <img src="{result["screenshot"]}" class="screenshot" alt="Screenshot">\n'

            html_content += "    </div>\n"

        html_content += """
</body>
</html>"""

        # HTMLファイル保存
        report_path = project_root / "browser_test_report.html"
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        print(f"[REPORT] HTMLレポートを保存しました: {report_path}")

    def cleanup(self):
        """後処理"""
        try:
            if hasattr(self, "driver"):
                self.driver.quit()
                print("[CLEANUP] WebDriverを終了しました")
        except Exception as e:
            print(f"[ERROR] クリーンアップ失敗: {e}")


def main():
    """メイン実行関数"""
    parser = argparse.ArgumentParser(description="Browser Testing Skill")
    parser.add_argument(
        "--headless",
        type=str,
        default="true",
        choices=["true", "false"],
        help="Run in headless mode",
    )
    parser.add_argument(
        "--url", default="http://localhost:3000", help="Target URL to test"
    )
    parser.add_argument(
        "--screenshots", action="store_true", help="Take screenshots during tests"
    )
    parser.add_argument("--report", action="store_true", help="Generate HTML report")
    parser.add_argument(
        "--timeout", type=int, default=10, help="Test timeout in seconds"
    )

    args = parser.parse_args()

    config = BrowserTestConfig(
        headless=args.headless.lower() == "true",
        url=args.url,
        screenshots=args.screenshots,
        report=args.report,
        timeout=args.timeout,
    )

    print(f"[CONFIG] URL: {config.url}")
    print(f"[CONFIG] Headless: {config.headless}")
    print(f"[CONFIG] Screenshots: {config.screenshots}")
    print(f"[CONFIG] Report: {config.report}")

    agent = BrowserTestAgent(config)
    result = agent.run_all_tests()

    # 結果保存
    output_file = project_root / "browser_test_results.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n[SAVED] テスト結果を保存しました: {output_file}")

    # 終了コード設定
    if "error" in result:
        sys.exit(1)
    elif result["summary"]["failed"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
