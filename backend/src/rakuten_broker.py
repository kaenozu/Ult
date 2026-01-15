import json
import time
from typing import Dict, Optional

import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

try:
    from webdriver_manager.chrome import ChromeDriverManager
    WEBDRIVER_MANAGER_AVAILABLE = True
except ImportError:
    WEBDRIVER_MANAGER_AVAILABLE = False


class RakutenBroker:
    """楽天証券 自動取引ブローカー (Selenium版)"""

    BASE_URL = "https://www.rakuten-sec.co.jp/"

    # ⚠️ 重要: 以下のセレクタは楽天証券のサイト更新により変更される可能性があります
    # ユーザー環境に合わせて適宜修正してください
    SELECTORS = {
        "login_btn_top": "login-btn",  # トップページのログインボタンID
        "login_id_input": "loginid",  # ログインID入力欄name
        "passwd_input": "passwd",  # パスワード入力欄name
        "home_indicator": "nav-home",  # ログイン成功確認用要素ID
        "total_assets": "total-assets",  # 資産合計表示ID
        "buying_power": "buying-power",  # 買付可能額表示ID
        "stock_search": "stock-search-input",  # 銘柄検索窓ID
        "buy_link_xpath": "//a[contains(text(), '現物買い')]",  # 現物買いリンクXPath
        "quantity_input": "quantity",  # 数量入力欄name
        "price_input": "price",  # 価格入力欄name
        "pin_input": "pin_code",  # 暗証番号入力欄name
        "execute_btn": "execute-btn",  # 注文実行ボタンID
    }

    def __init__(self, config_path: str = "config.json"):
        self.config = self._load_config(config_path)
        self.driver = None
        self.wait = None
        import os

        os.makedirs("logs", exist_ok=True)

    def _load_config(self, config_path: str) -> dict:
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
                return config.get("rakuten", {})
        except Exception as e:
            print(f"設定読み込みエラー: {e}")
            return {}

    def start_browser(self):
        """ブラウザを起動"""
        if self.driver:
            return

        options = Options()
        if self.config.get("headless", False):
            options.add_argument("--headless")

        # ユーザーエージェント設定（bot検知回避のため）
        options.add_argument(
            "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option("useAutomationExtension", False)

        try:
            if not WEBDRIVER_MANAGER_AVAILABLE:
                print("❌ webdriver_manager がインストールされていません。手動でドライバを指定するか、インストールしてください。")
                raise ImportError("webdriver_manager not found")

            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
            self.wait = WebDriverWait(self.driver, 20)

            # 隠蔽工作
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

            print("🌐 ブラウザを起動しました")
        except Exception as e:
            print(f"❌ ブラウザ起動エラー: {e}")
            raise

    def login(self) -> bool:
        """楽天証券にログイン"""
        if not self.driver:
            self.start_browser()

        try:
            print("🔑 ログイン処理開始...")
            self.driver.get(self.BASE_URL)

            # ログインボタンをクリック（トップページのデザインによるが、通常は右上にログインボタンがある）
            # ※セレクタは変更される可能性があります
            try:
                login_btn = self.wait.until(EC.element_to_be_clickable((By.ID, self.SELECTORS["login_btn_top"])))
                login_btn.click()
            except BaseException:
                # 直接ログインページへ
                self.driver.get("https://www.rakuten-sec.co.jp/ITS/V_ACT_Login.html")

            # ログインID入力
            login_id_input = self.wait.until(
                EC.presence_of_element_located((By.NAME, self.SELECTORS["login_id_input"]))
            )
            login_id_input.clear()
            login_id_input.send_keys(self.config["login_id"])

            # パスワード入力
            passwd_input = self.driver.find_element(By.NAME, self.SELECTORS["passwd_input"])
            passwd_input.clear()
            passwd_input.send_keys(self.config["password"])

            # ログイン実行
            submit_btn = self.driver.find_element(By.XPATH, "//input[@type='submit' or @alt='ログイン']")
            submit_btn.click()

            # ログイン成功確認（ホーム画面の要素で確認）
            self.wait.until(EC.presence_of_element_located((By.ID, self.SELECTORS["home_indicator"])))
            print("✅ ログイン成功")
            return True

        except Exception as e:
            print(f"❌ ログイン失敗: {e}")
            return False

    def logout(self):
        """ログアウト処理"""
        if not self.driver:
            return

        try:
            print("🚪 ログアウト処理開始...")
            # ログアウトボタンを探してクリック（セレクタは仮定）
            logout_btn = self.driver.find_element(By.XPATH, "//a[contains(text(), 'ログアウト')]")
            logout_btn.click()
            print("✅ ログアウト完了")
        except Exception as e:
            print(f"⚠️ ログアウト失敗（すでにログアウト済みか、要素が見つかりません）: {e}")

    def get_balance(self) -> Dict[str, float]:
        """資産状況を取得"""
        if not self.driver:
            if not self.login():
                return {}

        try:
            # ホーム画面または資産状況画面へ
            self.driver.get("https://member.rakuten-sec.co.jp/app/info_page.do")  # マイページ的なURL（要確認）

            # ※以下のセレクタは仮定です。実際のDOM構造に合わせて調整が必要です。
            # 資産合計
            total_equity_elem = self.wait.until(EC.presence_of_element_located((By.ID, self.SELECTORS["total_assets"])))
            total_equity = self._parse_currency(total_equity_elem.text)

            # 現金余力（買付可能額）
            cash_elem = self.driver.find_element(By.ID, self.SELECTORS["buying_power"])
            cash = self._parse_currency(cash_elem.text)

            return {
                "total_equity": total_equity,
                "cash": cash,
                "invested_amount": total_equity - cash,
            }
        except Exception as e:
            print(f"⚠️ 資産取得エラー: {e}")
            # ダミーデータを返す（開発用）
            return {"total_equity": 0, "cash": 0, "invested_amount": 0}

    def get_positions(self) -> pd.DataFrame:
        """保有銘柄一覧を取得"""
        # 実装予定: 保有商品一覧ページをスクレイピング
        print("⚠️ get_positions は未実装です")
        return pd.DataFrame()

    def buy_order(
        self,
        ticker: str,
        quantity: int,
        price: Optional[float] = None,
        order_type: str = "指値",
    ) -> bool:
        """
        買い注文を実行

        Args:
            ticker: 銘柄コード (例: "7203")
            quantity: 数量 (例: 100)
            price: 指値価格 (成行の場合はNone)
            order_type: "指値" or "成行"
        """
        if not self.driver:
            if not self.login():
                return False

        try:
            print(f"🛒 注文開始: {ticker} {quantity}株 {order_type} @ {price if price else 'Market'}")

            # 1. 銘柄検索または注文画面へ遷移
            search_box = self.wait.until(EC.presence_of_element_located((By.ID, self.SELECTORS["stock_search"])))
            search_box.clear()
            search_box.send_keys(ticker)
            search_box.submit()

            # 2. 「現物買い」ボタンクリック
            buy_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, self.SELECTORS["buy_link_xpath"])))
            buy_btn.click()

            # 3. 注文入力
            # 数量
            qty_input = self.wait.until(EC.presence_of_element_located((By.NAME, self.SELECTORS["quantity_input"])))
            qty_input.send_keys(str(quantity))

            # 価格/執行条件
            if order_type == "成行" or price is None:
                market_radio = self.driver.find_element(By.ID, "order-type-market")
                market_radio.click()
            else:
                limit_radio = self.driver.find_element(By.ID, "order-type-limit")
                limit_radio.click()
                price_input = self.driver.find_element(By.NAME, self.SELECTORS["price_input"])
                price_input.send_keys(str(price))

            # 4. 確認画面へ
            confirm_btn = self.driver.find_element(By.ID, "confirm-btn")
            confirm_btn.click()

            # 5. 暗証番号入力
            pin_input = self.wait.until(EC.presence_of_element_located((By.NAME, self.SELECTORS["pin_input"])))
            pin_input.send_keys(self.config["pin_code"])

            # 6. 注文確定
            execute_btn = self.driver.find_element(By.ID, self.SELECTORS["execute_btn"])
            execute_btn.click()

            print(f"✅ 注文完了: {ticker}")
            return True

        except Exception as e:
            print(f"❌ 注文失敗: {e}")
            # スクリーンショットを保存してデバッグ
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            self.driver.save_screenshot(f"logs/error_order_{ticker}_{timestamp}.png")
            return False

    def close(self):
        """ブラウザを閉じる"""
        if self.driver:
            self.driver.quit()
            self.driver = None
            print("🚪 ブラウザを閉じました")

    def _parse_currency(self, text: str) -> float:
        """文字列（¥1,234）を数値に変換"""
        try:
            clean_text = text.replace("¥", "").replace(",", "").replace("円", "").strip()
            return float(clean_text)
        except BaseException:
            return 0.0


if __name__ == "__main__":
    # テスト実行
    broker = RakutenBroker()
    try:
        if broker.login():
            balance = broker.get_balance()
            print(f"資産状況: {balance}")
    except Exception as e:
        print(f"エラー: {e}")
    finally:
        # broker.close() # デバッグのため開いたままにする
        pass
