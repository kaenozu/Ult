from playwright.sync_api import sync_playwright
import time

def verify_order_panel():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating to home page...")
        page.goto("http://localhost:3000")

        # Wait for search input
        try:
            print("Looking for search input...")
            page.wait_for_selector("#stockSearch", timeout=10000)
            page.fill("#stockSearch", "AAPL")
            page.press("#stockSearch", "Enter")

            print("Searching for AAPL...")
            page.wait_for_selector("text=Apple Inc.", timeout=15000)

            print("AAPL loaded. Switching to Order tab...")
            # Use get_by_role with exact name to avoid "注文一覧"
            # Note: "注文" is the label.
            order_tab = page.get_by_role("button", name="注文", exact=True)
            order_tab.click()

            # Wait for Order Panel content
            print("Waiting for Order Panel...")
            page.wait_for_selector("text=リスク管理設定", timeout=10000)
            print("Order Panel found.")

            # Verification: Initial state
            print("Verifying initial state...")
            assert page.is_visible("text=AAPL を取引")
            assert page.is_visible("text=余力:")
            
            # Click to expand
            print("Expanding Risk Settings...")
            page.click("text=リスク管理設定")

            # Wait for animation
            time.sleep(1)

            # Verification: Risk Settings content
            print("Verifying Risk Settings content...")
            assert page.is_visible("text=トレイリングストップ")
            assert page.is_visible("text=ボラティリティ調整")
            assert page.is_visible("text=ケリー基準ポジションサイジング")
            assert page.is_visible("text=ボラティリティ係数")

            # Verification: Default values check (assuming some labels or states)
            # Check if buttons are present
            assert page.is_visible("button:has-text('低')")
            assert page.is_visible("button:has-text('中')")
            assert page.is_visible("button:has-text('高')")
            assert page.is_visible("button:has-text('極端')")

            # Take screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/order_panel.png")
            print("Screenshot saved to verification/order_panel.png")

            print("E2E Verification SUCCESS")

        except Exception as e:
            print(f"E2E Verification FAILED: {e}")
            page.screenshot(path="verification/error_3.png")
            exit(1)

if __name__ == "__main__":
    verify_order_panel()
